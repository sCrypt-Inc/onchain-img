import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { useDropzone } from 'react-dropzone'

import { OnchainImg } from './contracts/onchainImg'
import artifact from '../artifacts/onchainImg.json'
import { ByteString, DefaultProvider, PubKey, SensiletSigner, bsv, findSig, toByteString, toHex } from 'scrypt-ts';
OnchainImg.loadArtifact(artifact);

function App() {

  const [inst, setInst] = useState<OnchainImg | null>(null)
  const [imgUrl, setImgUrl] = useState('')
  const [publicKey, setPublicKey] = useState<bsv.PublicKey | null>(null)
  const [txId, setTxId] = useState<string | null>(null)
  const [deployTxId, setDeployTxId] = useState<string | null>(null)

  const provider = new DefaultProvider({
    network: bsv.Networks.testnet
  });
  const signerRef = useRef(new SensiletSigner(provider))

  const deploy = async (rawImg: ByteString) => {
    if (publicKey && inst === null) {
      const instance = new OnchainImg(PubKey(toHex(publicKey)), rawImg)
      // Connect to a signer.
      await instance.connect(signerRef.current)

      // Contract deployment.
      const deployTx = await instance.deploy(1)
      console.log('deploy tx', deployTx.id)
      setInst(instance)
      setTxId(deployTx.id)
      setDeployTxId(deployTx.id)
    }
  }

  const call = async (rawImg: ByteString) => {
    if (publicKey && inst !== null) {
      // update image data
      const nextInst = inst.next();
      nextInst.imgRawBytes = rawImg;

      // call contract
      inst.methods.updateImg(
        rawImg,
        (sigResps) => findSig(sigResps, publicKey),
        {
          pubKeyOrAddrToSign: publicKey,
          next: {
            instance: nextInst,
            balance: 1
          }
        }
      ).then(({ tx, next }) => {
        console.log('call tx', tx.id)
        if (next) {
          setInst(next.instance);
          setTxId(tx.id);
        }
      })
    }
  }

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    const reader = new FileReader()
    reader.onabort = () => console.log('file reading was aborted')
    reader.onerror = () => console.log('file reading has failed')
    reader.onload = () => {
      const binaryStr = reader.result;
      if (binaryStr instanceof ArrayBuffer) {
        const rawImg = toByteString(Buffer.from(binaryStr).toString('hex'));
        if (inst === null) {
          deploy(rawImg);
        } else {
          call(rawImg);
        }
      }
    }
    reader.readAsArrayBuffer(file)
  }, [inst, publicKey])

  const { getRootProps, getInputProps } = useDropzone({ onDrop })

  const connectWallet = async () => {
    const signer = signerRef.current;
    const { isAuthenticated, error } = await signer.requestAuth();
    if (!isAuthenticated) {
      throw new Error(`Auth error: ${error}`);
    }
    const pk = await signer.getDefaultPubKey();
    setPublicKey(pk);
  }

  useEffect(() => {
    connectWallet()
      .catch(e => {
        console.log(e)
      })
  }, []);

  const updateImgUrl = async () => {
    if (inst !== null) {
      const url = inst.imgToBase64URL()
      if (url) {
        setImgUrl(url)
      }
    }
  }

  useEffect(() => {
    updateImgUrl();
  }, [inst]);

  return (
    <div className="App">
      <header className="App-header">
        {
          deployTxId && (<p>Contract id: {deployTxId}:0</p>)
        }
        {imgUrl && <img src={imgUrl} alt="img" />}
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <p>Drag & drop img file here, or click to select</p>
        </div>
        {
          txId && (<p>Current in tx output: {txId}:0 </p>)
        }
      </header>
    </div>
  );
}

export default App;

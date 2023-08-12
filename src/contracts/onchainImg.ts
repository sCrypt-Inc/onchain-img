import {
    method,
    prop,
    SmartContract,
    hash256,
    assert,
    ByteString,
    SigHash,
    PubKey,
    Sig
} from 'scrypt-ts'


export class OnchainImg extends SmartContract {
    @prop()
    pubkey: PubKey;

    @prop(true)
    imgRawBytes: ByteString;

    constructor(pubkey: PubKey, img: ByteString) {
        super(pubkey, img)
        this.pubkey = pubkey;
        this.imgRawBytes = img;
    }

    @method(SigHash.SINGLE)
    // @method()
    public updateImg(imgRawBytes: ByteString, sig: Sig) {
        // check signature
        assert(this.checkSig(sig, this.pubkey));
        // update img
        this.imgRawBytes = imgRawBytes;
        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value
        // output containing the latest state
        const output: ByteString = this.buildStateOutput(amount)
        // verify current tx has this single output
        assert(this.ctx.hashOutputs === hash256(output), 'hashOutputs mismatch')
    }

    imgToBase64URL() {
        if (this.imgRawBytes) {
            return `data:image/png;base64,${Buffer.from(this.imgRawBytes, 'hex').toString('base64')}`;
        }
        return null;
    }
}

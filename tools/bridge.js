import Web3 from 'web3';
import { info } from './other.js';
import { getGasPrice, getGasPriceEthereum, dataSendToken } from './web3.js';
import { bridgeAbi, abiToken, bridgeZkSyncAbi } from './abi.js';
import { subtract, multiply, divide, add } from 'mathjs';

export const getBridgeCost = async(rpc, gasPrice) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(bridgeAbi, info.bridgeMainet);

    const amountETHForTx = await contract.methods.l2TransactionBaseCost(
        w3.utils.toWei(gasPrice, 'gwei'),
        742563,
        800
    ).call();

    return { amountETHForTx };
}

export const dataBridgeETHtoZkSync = async(rpc, gasPrice, amount, addressTo) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(bridgeAbi, info.bridgeMainet);

    const dataBridge = await getBridgeCost(rpc, gasPrice);
    const valueTX = (add(amount, dataBridge.amountETHForTx)).toString();

    const data = await contract.methods.requestL2Transaction(
        addressTo,
        w3.utils.numberToHex(amount),
        '0x',
        742563,
        800,
        [],
        addressTo
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: addressTo, value: valueTX });
    return { encodeABI, estimateGas, valueTX };
}

export const dataBridgeETHToMainet = async(rpc, amount, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(bridgeZkSyncAbi, info.ETHBridge);

    const data = await contract.methods.withdraw(
        sender
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: amount });
    return { encodeABI, estimateGas };
}
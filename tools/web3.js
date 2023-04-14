import Web3 from 'web3';
import axios from 'axios';
import { info, privateToAddress } from './other.js';
import { abiToken } from './abi.js';

export const getGasPrice = async(rpcProvider) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpcProvider));
    const gasPrice = await w3.eth.getGasPrice();
    const gasPriceInGwei = w3.utils.fromWei(gasPrice, 'Gwei');

    return gasPriceInGwei;
}

export const getGasPriceEthereum = async() => {
    try {
        const res = await axios.get('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=FC2TA4DAG1XVSPM58GIPVW42V2YH7GGTK5');
        const baseFee = res.data.result.suggestBaseFee;
        const maxFee = res.data.result.FastGasPrice;
        const maxPriorityFee = parseFloat(res.data.result.gasUsedRatio.split(',')[2]).toFixed(3);

        return { baseFee, maxFee, maxPriorityFee };
    } catch (err) {
        console.log(err);
    };
}

export const getETHAmount = async(rpc, walletAddress) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const data = await w3.eth.getBalance(walletAddress);
    return data;
}

export const getAmountToken = async(rpc, tokenAddress, walletAddress) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const token = new w3.eth.Contract(abiToken, w3.utils.toChecksumAddress(tokenAddress));

    const data = await token.methods.balanceOf(
        walletAddress
    ).call();

    return data;
}

export const checkAllowance = async(rpc, tokenAddress, walletAddress, spender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const token = new w3.eth.Contract(abiToken, w3.utils.toChecksumAddress(tokenAddress));

    const data = await token.methods.allowance(
        walletAddress,
        spender
    ).call();

    return data;
}

export const dataApprove = async(rpc, tokenAddress, contractAddress, fromAddress) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(abiToken, w3.utils.toChecksumAddress(tokenAddress));

    const data = await contract.methods.approve(
        contractAddress,
        info.approveAmount,
    );
    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: fromAddress });

    return { encodeABI, estimateGas };
}

export const dataSendToken = async (rpc, tokenAddress, toAddress, amount, fromAddress) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(abiToken, w3.utils.toChecksumAddress(tokenAddress));

    const data = await contract.methods.transfer(
        toAddress,
        w3.utils.numberToHex(amount)
    );
    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: fromAddress });

    return { encodeABI, estimateGas };
}

export const sendZkSyncTX = async(rpc, gasLimit, gasPrice, toAddress, value, data, privateKey) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const fromAddress = privateToAddress(privateKey);
    
    const tx = {
        'from': fromAddress,
        'gas': gasLimit,
        'gasPrice': w3.utils.toWei(gasPrice, 'Gwei'),
        'chainId': await w3.eth.getChainId(),
        'to': toAddress,
        'nonce': await w3.eth.getTransactionCount(fromAddress),
        'value': w3.utils.numberToHex(value),
        'data': data
    };

    try {
        const signedTx = await w3.eth.accounts.signTransaction(tx, privateKey);
        await w3.eth.sendSignedTransaction(signedTx.rawTransaction, async(error, hash) => {
            if (!error) {
                console.log(`TX: ${info.explorer + hash}`);
            }
        });
    } catch (err) {
        console.log(`Error ZkSync TX: ${err}`);
    }
}

export const sendETHTX = async(rpc, gasLimit, maxFee, maxPriorityFee, toAddress, value, data, privateKey) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const fromAddress = privateToAddress(privateKey);
    
    const tx = {
        'from': fromAddress,
        'gas': gasLimit,
        'maxFeePerGas': w3.utils.toWei(maxFee, 'Gwei'),
        'maxPriorityFeePerGas': w3.utils.toWei(maxPriorityFee, 'Gwei'),
        'chainId': await w3.eth.getChainId(),
        'to': toAddress,
        'nonce': await w3.eth.getTransactionCount(fromAddress),
        'value': w3.utils.numberToHex(value),
        'data': data
    };

    const signedTx = await w3.eth.accounts.signTransaction(tx, privateKey);
    await w3.eth.sendSignedTransaction(signedTx.rawTransaction, async(error, hash) => {
        if (!error) {
            console.log(`TX: ${info.explorerMainet + hash}`);
        } else {
            console.log(`Error Tx: ${error}`);
        }
    });
}

export const sendArbitrumTX = async(rpc, gasLimit, maxFee, maxPriorityFee, toAddress, value, data, privateKey) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const fromAddress = privateToAddress(privateKey);
    
    const tx = {
        'from': fromAddress,
        'gas': gasLimit,
        'maxFeePerGas': w3.utils.toWei(maxFee, 'Gwei'),
        'maxPriorityFeePerGas': w3.utils.toWei(maxPriorityFee, 'Gwei'),
        'chainId': await w3.eth.getChainId(),
        'to': toAddress,
        'nonce': await w3.eth.getTransactionCount(fromAddress),
        'value': w3.utils.numberToHex(value),
        'data': data
    };

    const signedTx = await w3.eth.accounts.signTransaction(tx, privateKey);
    await w3.eth.sendSignedTransaction(signedTx.rawTransaction, async(error, hash) => {
        if (!error) {
            console.log(`TX: ${info.explorerArbitrum + hash}`);
        } else {
            console.log(`Error Tx: ${error}`);
        }
    });
}
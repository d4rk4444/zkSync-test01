import Web3 from 'web3';
import { info } from './other.js';
import { abiToken, nexonFinanceAbi } from './abi.js';
import { subtract, multiply, divide, add } from 'mathjs';

export const dataEnterMarkets = async(rpc, unitroller, cToken, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, unitroller);

    const data = await contract.methods.enterMarkets(
        [cToken]
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const checkMembership = async(rpc, unitroller, account, cToken) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, unitroller);

    const data = await contract.methods.checkMembership(
        account,
        cToken
    ).call()

    return data;
}

export const dataSupplyNexon = async(rpc, cToken, amount, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    if (cToken == info.nUSDC) {
        const data = await contract.methods.mint(
            w3.utils.numberToHex(amount)
        );
    
        const encodeABI = data.encodeABI();
        const estimateGas = await data.estimateGas({ from: sender });
        return { encodeABI, estimateGas };
    } else if (cToken == info.nETH) {
        const data = await contract.methods.mint();
    
        const encodeABI = data.encodeABI();
        const estimateGas = await data.estimateGas({ from: sender, value: amount });
        return { encodeABI, estimateGas };
    }
    
}

export const getAmountDeposit = async(rpc, cToken, account) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    const data = await contract.methods.getAccountSnapshot(
        account,
    ).call()

    const result = parseInt(data['1'] * data['3'] / 10**18);

    return result;
}

export const dataBorrowNexon = async(rpc, cToken, amount, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    const data = await contract.methods.borrow(
        w3.utils.numberToHex(amount)
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const getAmountBorrow = async(rpc, cToken, account) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    const data = await contract.methods.borrowBalanceStored(
        account,
    ).call()

    return data;
}

export const dataRepayNexon = async(rpc, cToken, amount, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    const data = await contract.methods.repayBorrow(
        w3.utils.numberToHex(amount)
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const getAmountRedeem = async(rpc, cToken, account) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    const data = await contract.methods.getAccountSnapshot(
        account,
    ).call()

    return data['1'];
}

export const dataRedeemNexon = async(rpc, cToken, amount, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(nexonFinanceAbi, cToken);

    const data = await contract.methods.redeem(
        w3.utils.numberToHex(amount)
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}
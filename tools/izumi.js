import Web3 from 'web3';
import { ethers } from 'ethers';
import { info } from './other.js';
import { iziAbi } from './abi.js';

export const dataSwapETHToTokenIzumi = async(rpc, amountETH, tokenAddress, feeLP, addressFrom) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(iziAbi, info.IzumiRouter);

    const encoded = ethers.utils.solidityPack(['address', 'uint24', 'address'], [info.WETH, feeLP, tokenAddress]);
    const data = await contract.methods.multicall(
        [
            await contract.methods.swapAmount(
                [
                    encoded,
                    addressFrom,
                    w3.utils.numberToHex(amountETH),
                    '1',
                    parseInt(Date.now() + 10 * 60 / 1000)
                ]
            ).encodeABI(),
            '0x12210e8a'
        ]
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: addressFrom, value: amountETH });
    return { encodeABI, estimateGas };
}

export const dataSwapTokenToETHIzumi = async(rpc, amountToken, tokenAddress, feeLP, addressFrom) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(iziAbi, info.IzumiRouter);

    const encoded = ethers.utils.solidityPack(['address', 'uint24', 'address'], [tokenAddress, feeLP, info.WETH]);
    const data = await contract.methods.multicall(
        [
            await contract.methods.swapAmount(
                [
                    encoded,
                    addressFrom,
                    w3.utils.numberToHex(amountToken),
                    '1',
                    parseInt(Date.now() + 10 * 60 / 1000)
                ]
            ).encodeABI(),
            await contract.methods.unwrapWETH9(
                0,
                addressFrom
            ).encodeABI()
        ]
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: addressFrom });
    return { encodeABI, estimateGas };
}
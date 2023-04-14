import Web3 from 'web3';
import { info } from './other.js';
import { spaceFiRouterAbi, abiToken } from './abi.js';
import { subtract, multiply, divide, composition, add, BigNumber, pow } from 'mathjs';

export const getFactory = async(rpc) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);

    const data = await contract.methods.factory().call()

    return data;
}

export const getPair = async(rpc, tokenA, tokenB) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceFactory);

    const data = await contract.methods.getPair(
        tokenA,
        tokenB
    ).call()

    return data;
}

export const getAmountsOut = async(rpc, amountIn, tokenIn, tokenOut, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);

    const data = await contract.methods.getAmountsOut(
        w3.utils.numberToHex(amountIn),
        [tokenIn, tokenOut]
    ).call()
    const result = parseInt(multiply(data[1], slippage));

    return result;
}

export const getAmountsIn = async(rpc, amountOut, tokenIn, tokenOut, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);

    const data = await contract.methods.getAmountsIn(
        w3.utils.numberToHex(amountOut),
        [tokenIn, tokenOut]
    ).call()
    const result = parseInt(multiply(data[0], slippage));

    return result;
}

export const dataSpaceSwapETHToToken = async(rpc, tokenA, tokenB, amountIn, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contractSwap = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);

    const data = await contractSwap.methods.swapExactETHForTokens(
        w3.utils.numberToHex(await getAmountsOut(info.rpc, amountIn, tokenA, tokenB, slippage)),
        [tokenA, tokenB],
        sender,
        Date.now() + 5 * 60 * 1000
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: amountIn });
    return { encodeABI, estimateGas };
}

export const dataSpaceSwapTokenToETH = async(rpc, tokenA, tokenB, amountIn, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contractSwap = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);

    const data = await contractSwap.methods.swapExactTokensForETH(
        w3.utils.numberToHex(amountIn),
        w3.utils.numberToHex(await getAmountsOut(info.rpc, amountIn, tokenA, tokenB, slippage)),
        [tokenA, tokenB],
        sender,
        Date.now() + 5 * 60 * 1000
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const dataSpaceAddLiquidityETH = async(rpc, amountUSDC, tokenB, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contractSwap = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);
    const amountETH = await getAmountsIn(info.rpc, amountUSDC, info.WETH, info.USDC, 1);

    const data = await contractSwap.methods.addLiquidityETH(
        tokenB,
        w3.utils.numberToHex(amountUSDC),
        w3.utils.numberToHex(await getAmountsOut(info.rpc, amountETH, info.WETH, info.USDC, slippage)),
        w3.utils.numberToHex(parseInt(multiply(amountETH, 0.995))),
        sender,
        Date.now() + 5 * 60 * 1000
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: amountETH });
    return { encodeABI, estimateGas, amountETH };
}

export const dataSpaceDeposit = async(rpc, amountLP, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contractSwap = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceFarmer);

    const data = await contractSwap.methods.deposit(
        '1',
        w3.utils.numberToHex(amountLP)
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const getSpaceFarmAmount = async(rpc, farmer) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceFarmer);

    const data = await contract.methods.userInfo(
        '1',
        farmer
    ).call()

   return data;
}

export const dataSpaceWithdraw = async(rpc, amountLP, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contractSwap = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceFarmer);

    const data = await contractSwap.methods.withdraw(
        '1',
        w3.utils.numberToHex(amountLP)
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const getSpaceAmountETHLiquidity = async(rpc, tokenB, amountLP, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const addressLP = await getPair(rpc, info.WETH, tokenB);
    const contract = new w3.eth.Contract(spaceFiRouterAbi, addressLP);

    const reserves = await contract.methods.getReserves().call()
    const total = await contract.methods.totalSupply().call()
    const result = parseInt(multiply(divide(reserves._reserve1 / 10**18, total / 10**18), amountLP, slippage));
    
    return result;
}

export const dataSpaceDeleteLiquidityETH = async(rpc, addressToken, amountLP, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(spaceFiRouterAbi, info.SpaceRouter);
    const amountETH = await getSpaceAmountETHLiquidity(rpc, info.USDC, amountLP, slippage);

    const data = await contract.methods.removeLiquidityETH(
        addressToken,
        w3.utils.numberToHex(amountLP),
        w3.utils.numberToHex(await getAmountsIn(info.rpc, amountETH, info.USDC, info.WETH, slippage)),
        w3.utils.numberToHex(amountETH),
        sender,
        Date.now() + 5 * 60 * 1000,
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}


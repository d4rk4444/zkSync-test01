import Web3 from 'web3';
import { info } from './other.js';
import { SSRouterAbi, SSClassicPoolFactoryAbi, SSPoolMasterAbi, SSLPPoolAbi, abiToken } from './abi.js';
import { subtract, multiply, divide, composition, add, BigNumber, pow } from 'mathjs';

export const getPool = async(rpc, addressPoolFactory, tokenA, tokenB) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSClassicPoolFactoryAbi, addressPoolFactory);

    const data = await contract.methods.getPool(
        tokenA,
        tokenB
    ).call()

    return data;
}

export const getAmountOut = async(rpc, addressLP, tokenIn, amountIn, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSLPPoolAbi, addressLP);

    const data = await contract.methods.getAmountOut(
        tokenIn,
        w3.utils.numberToHex(amountIn),
        sender
    ).call();

    const result = parseInt(multiply(data, slippage));
    return result;
}

export const getAmountIn = async(rpc, addressLP, tokenOut, amountOut, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSLPPoolAbi, addressLP);

    const data = await contract.methods.getAmountIn(
        tokenOut,
        w3.utils.numberToHex(amountOut),
        sender
    ).call()

    const result = parseInt(multiply(data, slippage));
    return result;
}

export const dataSwapETHToToken = async(rpc, addressToken, amountETH, router, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSRouterAbi, router);

    const dataSwap = w3.eth.abi.encodeParameters(['address', 'address', 'uint8'], [info.WETH, sender, 2]);

    const addressPool = await getPool(rpc, info.SSClassicPoolFactory, info.WETH, addressToken);
    const amountOut = await getAmountOut(rpc, addressPool, info.WETH, amountETH, sender, slippage);
    const deadline = Date.now() + 20 * 60 * 1000;

    const data = await contract.methods.swap(
        [[
            [[
                addressPool,
                dataSwap,
                "0x0000000000000000000000000000000000000000",
                "0x"
            ]],
            info.ETH,
            w3.utils.numberToHex(amountETH)
        ]],
        w3.utils.numberToHex(amountOut),
        deadline
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: amountETH });
    return { encodeABI, estimateGas };
}

export const dataSwapTokenToETH = async(rpc, addressToken, amount, router, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSRouterAbi, router);

    const dataSwap = w3.eth.abi.encodeParameters(['address', 'address', 'uint8'], [addressToken, sender, 1]);

    const addressPool = await getPool(rpc, info.SSClassicPoolFactory, info.WETH, addressToken);
    const amountOut = await getAmountOut(rpc, addressPool, addressToken, amount, sender, slippage);
    const deadline = Date.now() + 20 * 60 * 1000;

    const data = await contract.methods.swap(
        [[
            [[
                addressPool,
                dataSwap,
                "0x0000000000000000000000000000000000000000",
                "0x"
            ]],
            addressToken,
            amount
        ]],
        w3.utils.numberToHex(amountOut),
        deadline
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

//===============================================================

export const getPoolAmount = async(rpc, addressLP) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSLPPoolAbi, addressLP);

    const data = await contract.methods.getReserves().call()
    const _reserve0 = (data._reserve0).toString();
    const _reserve1 = (data._reserve1).toString();

    return { _reserve0, _reserve1 };
}

export const getTotalSupply = async(rpc, addressLP) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSLPPoolAbi, addressLP);

    const data = await contract.methods.totalSupply().call()

    return data.toString();
}

export const getLiquidityData = async(rpc, addressLP, amountUSDC, slippage) => {
    const poolETH = await getPoolAmount(rpc, addressLP);
    const totalLP = await getTotalSupply(rpc, addressLP);

    const minLiquidity = parseInt( divide( parseInt(totalLP / 10**6), parseInt(poolETH._reserve0 / 10**6) ) * amountUSDC * slippage);
    const priceETH = parseInt( divide(parseInt(poolETH._reserve0 / 10**6), parseInt(poolETH._reserve1 / 10**18)) * 10**6 * 0.995);
    //const priceUSDC = parseInt( divide(parseInt(poolETH._reserve1 / 10**18), parseInt(poolETH._reserve0 / 10**6)) * 10**18 * 0.995);

    return { minLiquidity, priceETH };
}

export const getLiquidityDataToken = async(rpc, addressLP, amountToken, slippage) => {
    const poolETH = await getPoolAmount(rpc, addressLP);
    const totalLP = await getTotalSupply(rpc, addressLP);

    const minLiquidity = parseInt( divide( parseInt(totalLP), parseInt(poolETH._reserve1) ) * amountToken * slippage);
    const priceETH = parseInt( divide(parseInt(poolETH._reserve0 / 10**18), parseInt(poolETH._reserve1 / 10**18)) * 10**18 * 0.995);
    //const priceToken = parseInt( divide(parseInt(poolETH._reserve1 / 10**18), parseInt(poolETH._reserve0 / 10**6)) * 10**18 * 0.995);

    return { minLiquidity, priceETH };
}

export const dataAddLiquidity = async(rpc, addressLP, amountUSDC, router, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSRouterAbi, router);

    const dataLiq = await getLiquidityData(rpc, addressLP, amountUSDC, slippage);
    const amountETH = parseInt( (amountUSDC / 10**6) / (dataLiq.priceETH / 10**6) * 10**18 );

    const dataAddress = w3.eth.abi.encodeParameters(['address'], [sender]);

    const data = await contract.methods.addLiquidity2(
        addressLP,
        [
            [
                info.USDC,
                w3.utils.numberToHex(amountUSDC)
            ],
            [
                info.ETH,
                w3.utils.numberToHex(amountETH)
            ]
        ],
        dataAddress,
        dataLiq.minLiquidity,
        "0x0000000000000000000000000000000000000000",
        "0x"
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: w3.utils.numberToHex(amountETH) });
    return { encodeABI, estimateGas, amountETH };
}

export const dataAddLiquidityToken = async(rpc, addressLP, addressToken, amountToken, router, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSRouterAbi, router);

    const dataLiq = await getLiquidityDataToken(rpc, addressLP, amountToken, slippage);
    const amountETH = parseInt(amountToken / 10**18 * dataLiq.priceETH);

    const dataAddress = w3.eth.abi.encodeParameters(['address'], [sender]);

    const data = await contract.methods.addLiquidity2(
        addressLP,
        [
            [
                addressToken,
                w3.utils.numberToHex(amountToken)
            ],
            [
                info.ETH,
                w3.utils.numberToHex(amountETH)
            ]
        ],
        dataAddress,
        w3.utils.numberToHex(dataLiq.minLiquidity),
        "0x0000000000000000000000000000000000000000",
        "0x"
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: w3.utils.numberToHex(amountETH) });
    return { encodeABI, estimateGas, amountETH };
}

//===============================================================

export const getWithdrawLiquidityData = async(rpc, addressLP, amountLP, slippage) => {
    const pool = await getPoolAmount(rpc, addressLP);
    const totalLP = await getTotalSupply(rpc, addressLP);
    const minETHAmount = parseInt( divide( parseInt(pool._reserve1 * 2 / 10**18), parseInt(totalLP / 10**6) ) * (amountLP / 10**6) * 10**18 * slippage);

    return minETHAmount;
}

export const getWithdrawLiquidityDataToken = async(rpc, addressLP, amountLP, slippage) => {
    const pool = await getPoolAmount(rpc, addressLP);
    const totalLP = await getTotalSupply(rpc, addressLP);
    const minETHAmount = parseInt( divide( parseInt(pool._reserve0 * 2 / 10**18), parseInt(totalLP / 10**18) ) * (amountLP / 10**18) * 10**18 * slippage);

    return minETHAmount;
}

export const dataDeleteLiquidity = async(rpc, addressLP, amountLP, router, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSRouterAbi, router);

    const amountETH = await getWithdrawLiquidityData(rpc, addressLP, amountLP, slippage);
    const dataSwap = w3.eth.abi.encodeParameters(
        ['address', 'address', 'uint8'], [info.WETH, sender, 1]
    );

    const data = await contract.methods.burnLiquiditySingle(
        addressLP,
        w3.utils.numberToHex(amountLP),
        dataSwap,
        w3.utils.numberToHex(amountETH),
        "0x0000000000000000000000000000000000000000",
        "0x",
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const dataDeleteLiquidityToken = async(rpc, addressLP, amountLP, router, sender, slippage) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(SSRouterAbi, router);

    const amountETH = await getWithdrawLiquidityDataToken(rpc, addressLP, amountLP, slippage);
    const dataSwap = w3.eth.abi.encodeParameters(
        ['address', 'address', 'uint8'], [info.WETH, sender, 1]
    );

    const data = await contract.methods.burnLiquiditySingle(
        addressLP,
        w3.utils.numberToHex(amountLP),
        dataSwap,
        w3.utils.numberToHex(amountETH),
        "0x0000000000000000000000000000000000000000",
        "0x",
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}

export const dataWrapETH = async(rpc, amountETH, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(abiToken, info.WETH);

    const data = await contract.methods.deposit();

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender, value: amountETH });
    return { encodeABI, estimateGas };
}

export const dataUnwrapETH = async(rpc, amount, sender) => {
    const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
    const contract = new w3.eth.Contract(abiToken, info.WETH);

    const data = await contract.methods.withdraw(
        amount
    );

    const encodeABI = data.encodeABI();
    const estimateGas = await data.estimateGas({ from: sender });
    return { encodeABI, estimateGas };
}
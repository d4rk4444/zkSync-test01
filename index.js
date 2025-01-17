import { info,
    orbiter,
    timeout,
    shuffle,
    parseFile,
    generateRandomAmount,
    privateToAddress } from './tools/other.js';
import { checkAllowance,
    getGasPriceEthereum,
    getETHAmount,
    getAmountToken,
    dataApprove,
    getGasPrice,
    sendZkSyncTX,
    sendETHTX, 
    dataSendToken,
    sendArbitrumTX} from './tools/web3.js';
import { dataBridgeETHToMainet, dataBridgeETHtoZkSync } from './tools/bridge.js';
import { dataSwapETHToToken,
    dataSwapTokenToETH,
    dataAddLiquidity,
    dataDeleteLiquidity, 
    dataAddLiquidityToken,
    dataDeleteLiquidityToken,
    dataWrapETH,
    dataUnwrapETH} from './tools/syncSwap.js';
import { dataEnterMarkets,
    checkMembership,
    dataSupplyNexon,
    getAmountDeposit,
    dataBorrowNexon,
    getAmountBorrow,
    dataRepayNexon,
    getAmountRedeem,
    dataRedeemNexon } from './tools/nexonFinance.js';
import { 
    dataSpaceSwapETHToToken,
    dataSpaceSwapTokenToETH,
    dataSpaceAddLiquidityETH,
    dataSpaceDeposit,
    getSpaceFarmAmount,
    dataSpaceWithdraw,
    dataSpaceDeleteLiquidityETH  } from './tools/spaceFi.js';
import { dataSwapETHToTokenIzumi, dataSwapTokenToETHIzumi } from './tools/izumi.js';
import { generateRandomName, dataRegisterName } from './tools/nft.js';
import { subtract, multiply, divide, composition, add, number } from 'mathjs';
import fs from 'fs';
import readline from 'readline-sync';
import consoleStamp from 'console-stamp';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
dotenv.config();

const output = fs.createWriteStream(`history.log`, { flags: 'a' });
const logger = new console.Console(output);
consoleStamp(console, { format: ':date(HH:MM:ss)' });
consoleStamp(logger, { format: ':date(yyyy/mm/dd HH:MM:ss)', stdout: output });

const pauseTime = generateRandomAmount(process.env.TIMEOUT_ACTION_SEC_MIN * 1000, process.env.TIMEOUT_ACTION_SEC_MAX * 1000, 0);
const slippage = generateRandomAmount(1 - process.env.SLIPPAGE_MIN / 100, 1 - process.env.SLIPPAGE_MAX / 100, 3);


const bridgeETHToZkSync = async(privateKey, type) => {
    const addressETH = privateToAddress(privateKey);
    const needGasPrice = process.env.GAS_PRICE_BRIDGE;

    let isReady;
    let i = 0;
    while(!isReady) {
        try {
            await getGasPriceEthereum().then(async(fee) => {
                const gasPriceNow = (parseFloat(fee.baseFee * 1.75).toFixed(6)).toString();
                if (Number(gasPriceNow) <= needGasPrice) {
                    if (type == 0) {
                        const amountETH = generateRandomAmount(process.env.ETH_BRIDGE_MIN * 10**18, process.env.ETH_BRIDGE_MAX * 10**18, 0);
                        await dataBridgeETHtoZkSync(info.rpcMainet, gasPriceNow, amountETH, addressETH).then(async(res) => {
                            console.log(chalk.yellow(`Bridge ${amountETH / 10**18}ETH to zkSync. GasPrice = ${gasPriceNow}`));
                            logger.log(`Bridge ${amountETH / 10**18}ETH to zkSync. GasPrice = ${gasPriceNow}`);
                            await sendETHTX(info.rpcMainet, 150024, gasPriceNow, '1.5', info.bridgeMainet, res.valueTX, res.encodeABI, privateKey);
                            isReady = true;
                        });
                    } else if (type == 1) {
                        await dataBridgeETHtoZkSync(info.rpcMainet, gasPriceNow, '100000', addressETH).then(async(res) => {
                            const amountFee = parseInt(multiply(res.estimateGas, add(gasPriceNow, 1.5 * 10**9)));
                            await getETHAmount(info.rpcMainet, addressETH).then(async(amountETH) => {
                                const random = generateRandomAmount(process.env.PERCENT_BRIDGE_TO_ZKSYNC_MIN / 100, process.env.PERCENT_BRIDGE_TO_ZKSYNC_MAX / 100, 3);
                                amountETH = parseInt(multiply(subtract(amountETH, amountFee), random));

                                await dataBridgeETHtoZkSync(info.rpcMainet, gasPriceNow, amountETH, addressETH).then(async(res1) => {
                                    console.log(chalk.yellow(`Bridge ${amountETH / 10**18}ETH to zkSync. GasPrice = ${gasPriceNow}`));
                                    logger.log(`Bridge ${amountETH / 10**18}ETH to zkSync. GasPrice = ${gasPriceNow}`);
                                    await sendETHTX(info.rpcMainet, 150024, gasPriceNow, '1.5', info.bridgeMainet, res1.valueTX, res1.encodeABI, privateKey);
                                    isReady = true;
                                });
                            });
                        });
                    }
                } else if (Number(gasPriceNow) > needGasPrice) {
                    console.log(`GasPrice NOW = ${gasPriceNow} > NEED ${needGasPrice}`);
                    await timeout(10000);
                }
            });
        } catch (err) {
            i = i + 1;
            logger.log(err.message);
            console.log(err.message);
            if (i == 3) {
                logger.log(err);
                logger.log('3 ERROR SKIP WALLET');
                console.log(chalk.redBright('3 ERROR SKIP WALLET'));
                return;
            }
            await timeout(pauseTime);
        }
    }
}

const syncSwapStart = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap'));
    logger.log('Start SyncSwap');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> USDC
    console.log(chalk.yellow(`Swap ETH -> USDC`));
    logger.log(`Swap ETH -> USDC`);
    try {
        await dataSwapETHToToken(info.rpc, info.USDC, amountETH, info.SSRouter, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                logger.log(`Swap ETH -> USDC Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE USDC
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Router`));
                    logger.log(`Start Approve USDC for Router`);
                    await dataApprove(info.rpc, info.USDC, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //ADD LIQUIDITY ETH/USDC
    console.log(chalk.yellow(`Add Liqidity ETH/USDC`));
    logger.log(`Add Liqidity ETH/USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            await dataAddLiquidity(info.rpc, info.LPPool, amountUSDC, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, res.amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Add Liqidity Successful`));
                    logger.log(`Add Liqidity Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const syncSwapEnd = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap End'));
    logger.log('Start SyncSwap End');
    const address = privateToAddress(privateKey);
    const checkBalance = await getAmountToken(info.rpc, info.LPPool, address);
    if (checkBalance == 0) {
        return false;
    }

    //APPROVE LP
    console.log(chalk.yellow(`Approve LP`));
    logger.log(`Approve LP`);
    try {
        await getAmountToken(info.rpc, info.LPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.LPPool, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve LP for Router`));
                    logger.log(`Start Approve LP for Router`);
                    await dataApprove(info.rpc, info.LPPool, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.LPPool, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve LP Successful`));
                    logger.log(`Approve LP Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //WITHDRAW LIQUIDITY ETH/USDC
    console.log(chalk.yellow(`Withdraw Liqidity ETH/USDC`));
    logger.log(`Withdraw Liqidity ETH/USDC`);
    try {
        await getAmountToken(info.rpc, info.LPPool, address).then(async(amountLP) => {
            await dataDeleteLiquidity(info.rpc, info.LPPool, amountLP, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, res.amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Withdraw Liqidity Successful`));
                    logger.log(`Withdraw Liqidity Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const syncSwapOTStart = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap ETH/OT'));
    logger.log('Start SyncSwap ETH/OT');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> OT
    console.log(chalk.yellow(`Swap ETH -> OT`));
    logger.log(`Swap ETH -> OT`);
    try {
        await dataSwapETHToToken(info.rpc, info.OT, amountETH, info.SSRouter, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> OT Successful`));
                logger.log(`Swap ETH -> OT Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE OT
    console.log(chalk.yellow(`Approve OT`));
    logger.log(`Approve OT`);
    try {
        await getAmountToken(info.rpc, info.OT, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.OT, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve OT for Router`));
                    logger.log(`Start Approve OT for Router`);
                    await dataApprove(info.rpc, info.OT, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.OT, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve OT Successful`));
                    logger.log(`Approve OT Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //ADD LIQUIDITY ETH/OT
    console.log(chalk.yellow(`Add Liqidity ETH/OT`));
    logger.log(`Add Liqidity ETH/OT`);
    try {
        await getAmountToken(info.rpc, info.OT, address).then(async(amountOT) => {
            await dataAddLiquidityToken(info.rpc, info.OTLPPool, info.OT, amountOT, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, res.amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Add Liqidity Successful`));
                    logger.log(`Add Liqidity Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const syncSwapOTEnd = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap OT End'));
    logger.log('Start SyncSwap OT End');
    const address = privateToAddress(privateKey);
    const checkBalance = await getAmountToken(info.rpc, info.OTLPPool, address);
    if (checkBalance == 0) {
        return false;
    }

    //APPROVE OT LP
    console.log(chalk.yellow(`Approve OT LP`));
    logger.log(`Approve OT LP`);
    try {
        await getAmountToken(info.rpc, info.OTLPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.OTLPPool, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve OT LP for Router`));
                    logger.log(`Start Approve OT LP for Router`);
                    await dataApprove(info.rpc, info.OTLPPool, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.OTLPPool, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve OT LP Successful`));
                    logger.log(`Approve OT LP Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //WITHDRAW LIQUIDITY ETH/OT
    console.log(chalk.yellow(`Withdraw Liqidity ETH/OT`));
    logger.log(`Withdraw Liqidity ETH/OT`);
    try {
        await getAmountToken(info.rpc, info.OTLPPool, address).then(async(amountLP) => {
            await dataDeleteLiquidityToken(info.rpc, info.OTLPPool, amountLP, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Withdraw ETH/OT Liqidity Successful`));
                    logger.log(`Withdraw ETH/OT Liqidity Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const syncSwapWithoutLiq = async(privateKey, swapBack) => {
    console.log(chalk.cyan('Start SyncSwap Without Liquidity'));
    logger.log('Start SyncSwap Without Liquidity');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> USDC
    console.log(chalk.yellow(`Swap ETH -> USDC`));
    logger.log(`Swap ETH -> USDC`);
    try {
        await dataSwapETHToToken(info.rpc, info.USDC, amountETH, info.SSRouter, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                logger.log(`Swap ETH -> USDC Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE USDC
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Router`));
                    logger.log(`Start Approve USDC for Router`);
                    await dataApprove(info.rpc, info.USDC, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    if (swapBack) {
        //SWAP USDC -> ETH
        console.log(chalk.yellow(`SWAP USDC -> ETH`));
        logger.log(`SWAP USDC -> ETH`);
        try {
            await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
                await dataSwapTokenToETH(info.rpc, info.USDC, amountUSDC, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                        console.log(chalk.magentaBright(`Swap USDC -> ETH Successful`));
                        logger.log(`Swap USDC -> ETH Successful`);
                    });
                });
            });
            await timeout(pauseTime);
        } catch (err) {
            logger.log(err);
            console.log(err.message);
            return;
        }
    }
    

    return true;
} //+

const syncSwapOTWithoutLiq = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap OT Without Liquidity'));
    logger.log('Start SyncSwap OT Without Liquidity');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> OT
    console.log(chalk.yellow(`Swap ETH -> OT`));
    logger.log(`Swap ETH -> OT`);
    try {
        await dataSwapETHToToken(info.rpc, info.OT, amountETH, info.SSRouter, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> OT Successful`));
                logger.log(`Swap ETH -> OT Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE OT
    console.log(chalk.yellow(`Approve OT`));
    logger.log(`Approve OT`);
    try {
        await getAmountToken(info.rpc, info.OT, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.OT, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve OT for Router`));
                    logger.log(`Start Approve OT for Router`);
                    await dataApprove(info.rpc, info.OT, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.OT, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve OT Successful`));
                    logger.log(`Approve OT Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SWAP OT -> ETH
    console.log(chalk.yellow(`SWAP OT -> ETH`));
    logger.log(`SWAP OT -> ETH`);
    try {
        await getAmountToken(info.rpc, info.OT, address).then(async(amountOT) => {
            await dataSwapTokenToETH(info.rpc, info.OT, amountOT, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Swap OT -> ETH Successful`));
                    logger.log(`Swap OT -> ETH Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }


    return true;
} //+

const syncSwapETHToUSDC = async(privateKey) => {
    const address = privateToAddress(privateKey);
    const random = generateRandomAmount(process.env.ETH_SWAP_PERCENT_MIN / 100, process.env.ETH_SWAP_PERCENT_MAX / 100, 3);

    //SWAP ETH -> USDC
    console.log(chalk.yellow(`Swap ETH -> USDC`));
    logger.log(`Swap ETH -> USDC`);
    try {
        await getETHAmount(info.rpc, address).then(async(amountETH) => {
            amountETH = parseInt(multiply(amountETH, random));
            await dataSwapETHToToken(info.rpc, info.USDC, amountETH, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                    logger.log(`Swap ETH -> USDC Successful`);
                });
            });
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }
} //+

const syncSwapUSDCToETH = async(privateKey) => {
    const address = privateToAddress(privateKey);

    //APPROVE USDC
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Router`));
                    logger.log(`Start Approve USDC for Router`);
                    await dataApprove(info.rpc, info.USDC, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SWAP USDC -> ETH
    console.log(chalk.yellow(`SWAP USDC -> ETH`));
    logger.log(`SWAP USDC -> ETH`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            await dataSwapTokenToETH(info.rpc, info.USDC, amountUSDC, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.yellow(`Successful Swap`));
                });
            });
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }
} //+

const spaceFiStart = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi'));
    logger.log('Start SpaceFi');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> USDC
    console.log(chalk.yellow(`Swap ETH -> USDC`));
    logger.log(`Swap ETH -> USDC`);
    try {
        await dataSpaceSwapETHToToken(info.rpc, info.WETH, info.USDC, amountETH, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                logger.log(`Swap ETH -> USDC Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE USDC
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Space Router`));
                    logger.log(`Start Approve USDC for Space Router`);
                    await dataApprove(info.rpc, info.USDC, info.SpaceRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //ADD LIQUIDITY ETH/USDC
    console.log(chalk.yellow(`Space Add Liqidity ETH/USDC`));
    logger.log(`Space Add Liqidity ETH/USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            await dataSpaceAddLiquidityETH(info.rpc, amountUSDC, info.USDC, address, 0.98).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, res.amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Space Add Liqidity Successful`));
                    logger.log(`Space Add Liqidity Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE LP FOR FARM
    console.log(chalk.yellow(`Approve LP`));
    logger.log(`Approve LP`);
    try {
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.SpaceLPPool, address, info.SpaceFarmer).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve LP for Space Farmer`));
                    logger.log(`Start Approve LP for Space Farmer`);
                    await dataApprove(info.rpc, info.SpaceLPPool, info.SpaceFarmer, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SpaceLPPool, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve LP Successful`));
                    logger.log(`Approve LP Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //DEPOSIT LP TO SPACE FARM
    console.log(chalk.yellow(`DEPOSIT LP TO FARM`));
    logger.log(`DEPOSIT LP TO FARM`);
    try {
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(amountLP) => {  
            await dataSpaceDeposit(info.rpc, amountLP, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceFarmer, res.amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Space Deposit LP Successful`));
                    logger.log(`Space Deposit LP Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const spaceFiEnd = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi End [Withdraw, Delete Liquidity, Swap USDC -> ETH]'));
    logger.log('Start SpaceFi End [Withdraw, Delete Liquidity, Swap USDC -> ETH]');
    const address = privateToAddress(privateKey);
    const checkBalance = await getSpaceFarmAmount(info.rpc, address);
    if (checkBalance == 0) {
        return false;
    }

    //WITHDRAW LP FROM SPACE FARMER
    console.log(chalk.yellow(`WITHDRAW LP FROM SPACE FARMER`));
    logger.log(`WITHDRAW LP FROM SPACE FARMER`);
    try {
        await getSpaceFarmAmount(info.rpc, address).then(async(res) => {
            await dataSpaceWithdraw(info.rpc, res, address).then(async(res1) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SpaceFarmer, null, res1.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Withdraw LP Successful`));
                    logger.log(`Withdraw LP Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE SPACE LP
    console.log(chalk.yellow(`Approve Space LP`));
    logger.log(`Approve Space LP`);
    try {
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.SpaceLPPool, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve LP for Space Router`));
                    logger.log(`Start Approve LP for Space Router`);
                    await dataApprove(info.rpc, info.SpaceLPPool, info.SpaceRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SpaceLPPool, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve Space LP Successful`));
                    logger.log(`Approve Space LP Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //DELETE LIQUIDITY SPACE
    console.log(chalk.yellow(`DELETE LIQUIDITY SPACE`));
    logger.log(`DELETE LIQUIDITY SPACE`);
    try {
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(amountLP) => {   
            await dataSpaceDeleteLiquidityETH(info.rpc, info.USDC, amountLP, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Delete Liquidity Space LP Successful`));
                    logger.log(`Delete Liquidity Space LP Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SWAP SPACE USDC -> ETH
    console.log(chalk.yellow(`SWAP SPACE USDC -> ETH`));
    logger.log(`SWAP SPACE USDC -> ETH`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            await dataSpaceSwapTokenToETH(info.rpc, info.USDC, info.WETH, amountUSDC, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Swap Space USDC -> ETH Successful`));
                    logger.log(`Swap Space USDC -> ETH Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const spaceFiStartSPACE = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi SPACE'));
    logger.log('Start SpaceFi SPACE');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> SPACE
    console.log(chalk.yellow(`Swap ETH -> SPACE`));
    logger.log(`Swap ETH -> SPACE`);
    try {
        await dataSpaceSwapETHToToken(info.rpc, info.WETH, info.SPACE, amountETH, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> SPACE Successful`));
                logger.log(`Swap ETH -> SPACE Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE SPACE
    console.log(chalk.yellow(`Approve SPACE`));
    logger.log(`Approve SPACE`);
    try {
        await getAmountToken(info.rpc, info.SPACE, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.SPACE, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve SPACE for Space Router`));
                    logger.log(`Start Approve SPACE for Space Router`);
                    await dataApprove(info.rpc, info.SPACE, info.SpaceRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SPACE, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve SPACE Successful`));
                    logger.log(`Approve SPACE Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //ADD LIQUIDITY ETH/SPACE
    console.log(chalk.yellow(`Space Add Liqidity ETH/SPACE`));
    logger.log(`Space Add Liqidity ETH/SPACE`);
    try {
        await getAmountToken(info.rpc, info.SPACE, address).then(async(amountSPACE) => {
            await dataSpaceAddLiquidityETH(info.rpc, amountSPACE, info.SPACE, address, 0.98).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, res.amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`ETH/SPACE Add Liqidity Successful`));
                    logger.log(`ETH/SPACE Add Liqidity Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const spaceFiEndSPACE = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi End SPACE [Delete Liquidity, Swap SPACE -> ETH]'));
    logger.log('Start SpaceFi End SPACE [Delete Liquidity, Swap SPACE -> ETH]');
    const address = privateToAddress(privateKey);
    const checkBalance = await getAmountToken(info.rpc, info.LPPoolSPACE, address);
    if (checkBalance == 0) {
        return false;
    }

    //APPROVE SPACE LP
    console.log(chalk.yellow(`Approve Space LP`));
    logger.log(`Approve Space LP`);
    try {
        await getAmountToken(info.rpc, info.LPPoolSPACE, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.LPPoolSPACE, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve ETH/SPACE LP for Space Router`));
                    logger.log(`Start Approve ETH/SPACE LP for Space Router`);
                    await dataApprove(info.rpc, info.LPPoolSPACE, info.SpaceRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.LPPoolSPACE, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve ETH/SPACE LP Successful`));
                    logger.log(`Approve ETH/SPACE LP Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //DELETE LIQUIDITY ETH/SPACE
    console.log(chalk.yellow(`DELETE LIQUIDITY ETH/SPACE`));
    logger.log(`DELETE LIQUIDITY ETH/SPACE`);
    try {
        await getAmountToken(info.rpc, info.LPPoolSPACE, address).then(async(amountLP) => {   
            await dataSpaceDeleteLiquidityETH(info.rpc, info.SPACE, amountLP, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Delete Liquidity ETH/SPACE LP Successful`));
                    logger.log(`Delete Liquidity ETH/SPACE LP Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SWAP SPACE SPACE -> ETH
    console.log(chalk.yellow(`SWAP SPACE SPACE -> ETH`));
    logger.log(`SWAP SPACE SPACE -> ETH`);
    try {
        await getAmountToken(info.rpc, info.SPACE, address).then(async(amountSPACE) => {
            await dataSpaceSwapTokenToETH(info.rpc, info.SPACE, info.WETH, amountSPACE, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Swap Space SPACE -> ETH Successful`));
                    logger.log(`Swap Space SPACE -> ETH Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const spaceFiWithoutLiq = async(privateKey, swapBack) => {
    console.log(chalk.cyan('Start SpaceFi Without Liquidity'));
    logger.log('Start SpaceFi Without Liquidity');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> USDC
    console.log(chalk.yellow(`Swap ETH -> USDC`));
    logger.log(`Swap ETH -> USDC`);
    try {
        await dataSpaceSwapETHToToken(info.rpc, info.WETH, info.USDC, amountETH, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                logger.log(`Swap ETH -> USDC Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE USDC
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Space Router`));
                    logger.log(`Start Approve USDC for Space Router`);
                    await dataApprove(info.rpc, info.USDC, info.SpaceRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    if (swapBack) {
        //SWAP SPACE USDC -> ETH
        console.log(chalk.yellow(`SWAP SPACE USDC -> ETH`));
        logger.log(`SWAP SPACE USDC -> ETH`);
        try {
            await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
                await dataSpaceSwapTokenToETH(info.rpc, info.USDC, info.WETH, amountUSDC, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                        console.log(chalk.magentaBright(`Swap Space USDC -> ETH Successful`));
                        logger.log(`Swap Space USDC -> ETH Successful`);
                    });
                });
            });
            await timeout(pauseTime);
        } catch (err) {
            logger.log(err);
            console.log(err.message);
            return;
        }
    }

    return true;
} //+

const spaceFiSPACEWithoutLiq = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi SPACE Without Liquidity'));
    logger.log('Start SpaceFi SPACE Without Liquidity');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> SPACE
    console.log(chalk.yellow(`Swap ETH -> SPACE`));
    logger.log(`Swap ETH -> SPACE`);
    try {
        await dataSpaceSwapETHToToken(info.rpc, info.WETH, info.SPACE, amountETH, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap ETH -> SPACE Successful`));
                logger.log(`Swap ETH -> SPACE Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE SPACE
    console.log(chalk.yellow(`Approve SPACE`));
    logger.log(`Approve SPACE`);
    try {
        await getAmountToken(info.rpc, info.SPACE, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.SPACE, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve SPACE for Space Router`));
                    logger.log(`Start Approve SPACE for Space Router`);
                    await dataApprove(info.rpc, info.SPACE, info.SpaceRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SPACE, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve SPACE Successful`));
                    logger.log(`Approve SPACE Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SWAP SPACE SPACE -> ETH
    console.log(chalk.yellow(`SWAP SPACE SPACE -> ETH`));
    logger.log(`SWAP SPACE SPACE -> ETH`);
    try {
        await getAmountToken(info.rpc, info.SPACE, address).then(async(amountSPACE) => {
            await dataSpaceSwapTokenToETH(info.rpc, info.SPACE, info.WETH, amountSPACE, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Swap Space SPACE -> ETH Successful`));
                    logger.log(`Swap Space SPACE -> ETH Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }


    return true;
} //+

const nexonFinanceStart = async(privateKey, swapBack) => {
    console.log(chalk.cyan('Start Nexon Finance [Swap/Deposit/Borrow/Repay/Withdraw]'));
    logger.log('Start Nexon Finance [Swap/Deposit/Borrow/Repay/Withdraw]');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //SWAP ETH -> USDC
    console.log(chalk.yellow(`Swap ETH -> USDC`));
    logger.log(`Swap ETH -> USDC`);
    try {
        await dataSwapETHToToken(info.rpc, info.USDC, amountETH, info.SSRouter, address, slippage).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Swap Successful`));
                logger.log(`Swap Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //Enter Markets USDC
    console.log(chalk.yellow(`Enter Markets USDC`));
    logger.log(`Enter Markets USDC`);
    try {
        await checkMembership(info.rpc, info.Unitoller, address, info.nUSDC).then(async(res) => {
            if (!res) { 
                await dataEnterMarkets(info.rpc, info.Unitoller, info.nUSDC, address).then(async(res1) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.Unitoller, null, res1.encodeABI, privateKey);
                    });
                });
            }
        });
        console.log(chalk.magentaBright(`Enter Markets Successful`));
        logger.log(`Enter Markets Successful`);
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE USDC
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.nUSDC).then(async(res) => {
                if (Number(res) < balance) {
                    await dataApprove(info.rpc, info.USDC, info.nUSDC, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve Successful`));
                    logger.log(`Approve Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SUPPLY USDC
    console.log(chalk.yellow(`SUPPLY USDC`));
    logger.log(`SUPPLY USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            amountUSDC = parseInt(amountUSDC / 10**5) * 10**5;
            await dataSupplyNexon(info.rpc, info.nUSDC, amountUSDC, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nUSDC, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Supply Successful`));
                    logger.log(`Supply Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //BORROW USDC
    console.log(chalk.yellow(`BORROW USDC`));
    logger.log(`BORROW USDC`);
    try {
        await getAmountDeposit(info.rpc, info.nUSDC, address).then(async(amountUSDC) => {
            const supplyBorrow = parseFloat((1 - generateRandomAmount(1 - process.env.SLIPPAGE_BORROW_MIN / 100, 1 - process.env.SLIPPAGE_BORROW_MAX / 100, 2))).toFixed(2);
            amountUSDC = parseInt(amountUSDC * supplyBorrow / 10**5) * 10**5;
            await dataBorrowNexon(info.rpc, info.nUSDC, amountUSDC, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nUSDC, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Borrow Successful`));
                    logger.log(`Borrow Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //REPAY USDC
    console.log(chalk.yellow(`REPAY USDC`));
    logger.log(`REPAY USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(res1) => {
            await dataRepayNexon(info.rpc, info.nUSDC, res1, address).then(async(res2) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res2.estimateGas, gasPrice, info.nUSDC, null, res2.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Repay Successful`));
                    logger.log(`Repay Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //WITHDRAW USDC
    console.log(chalk.yellow(`WITHDRAW USDC`));
    logger.log(`WITHDRAW USDC`);
    try {
        await getAmountRedeem(info.rpc, info.nUSDC, address).then(async(amountRedeem) => {
            await dataRedeemNexon(info.rpc, info.nUSDC, amountRedeem, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nUSDC, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Withdraw Successful`));
                    logger.log(`Withdraw Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //APPROVE USDC SYNCSWAP
    console.log(chalk.yellow(`Approve USDC`));
    logger.log(`Approve USDC`);
    try {
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for SyncSwap`));
                    logger.log(`Start Approve USDC for SyncSwap`);
                    await dataApprove(info.rpc, info.USDC, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve USDC SyncSwap Successful`));
                    logger.log(`Approve USDC SyncSwap Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    if (swapBack) {
        //SWAP USDC -> ETH
        console.log(chalk.yellow(`SWAP USDC -> ETH`));
        logger.log(`SWAP USDC -> ETH`);
        try {
            await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
                await dataSwapTokenToETH(info.rpc, info.USDC, amountUSDC, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                        console.log(chalk.magentaBright(`Swap USDC -> ETH Successful`));
                        logger.log(`Swap USDC -> ETH Successful`);
                    });
                });
            });
            await timeout(pauseTime);
        } catch (err) {
            logger.log(err);
            console.log(err.message);
            return;
        }
    }

    return true;
} //+

const nexonFinanceETHStart = async(privateKey) => {
    console.log(chalk.cyan('Start Nexon Finance ETH [Deposit/Borrow]'));
    logger.log('Start Nexon Finance [Deposit/Borrow]');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    //Enter Markets USDC
    console.log(chalk.yellow(`Enter Markets ETH`));
    logger.log(`Enter Markets ETH`);
    
    try {
        await checkMembership(info.rpc, info.Unitoller, address, info.nETH).then(async(res) => {
            if (!res) { 
                await dataEnterMarkets(info.rpc, info.Unitoller, info.nETH, address).then(async(res1) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.Unitoller, null, res1.encodeABI, privateKey);
                    });
                });
            } else if (res) {
                console.log(chalk.magentaBright(`Enter Markets ETH Successful`));
                logger.log(`Enter Markets ETH Successful`);
            }
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SUPPLY ETH
    console.log(chalk.yellow(`SUPPLY ETH`));
    logger.log(`SUPPLY ETH`);
    try {
        await dataSupplyNexon(info.rpc, info.nETH, amountETH, address).then(async(res) => {
            await getGasPrice(info.rpc).then(async(gasPrice) => {
                await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nETH, amountETH, res.encodeABI, privateKey);
                console.log(chalk.magentaBright(`Supply ETH Successful`));
                logger.log(`Supply ETH Successful`);
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //WITHDRAW ETH
    console.log(chalk.yellow(`WITHDRAW ETH`));
    logger.log(`WITHDRAW ETH`);
    try {
        await getAmountRedeem(info.rpc, info.nETH, address).then(async(amountRedeem) => {
            await dataRedeemNexon(info.rpc, info.nETH, amountRedeem, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nETH, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Withdraw ETH Successful`));
                    logger.log(`Withdraw ETH Successful`);
                });
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const bridgeETHToEthereum = async(privateKey) => {
    const addressETH = privateToAddress(privateKey);

    try {
        await getETHAmount(info.rpc, addressETH).then(async(amountETH) => {
            const fee = 0.25 * 10**9 * (await dataBridgeETHToMainet(info.rpc, '100', addressETH)).estimateGas;
            const random = generateRandomAmount(process.env.PERCENT_BRIDGE_TO_ETHEREUM_MIN / 100, process.env.PERCENT_BRIDGE_TO_ETHEREUM_MAX / 100, 3);
            amountETH = parseInt(multiply(subtract(amountETH, fee), random));

            await dataBridgeETHToMainet(info.rpc, amountETH, addressETH).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    console.log(chalk.yellow(`Bridge ${amountETH / 10**18}ETH to Ethereum`));
                    logger.log(`Bridge ${amountETH / 10**18}ETH to Ethereum`);
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.ETHBridge, amountETH, res.encodeABI, privateKey);
                });
            });
        });
    } catch (err) {
        logger.log(err.message);
        console.log(err.message);
        await timeout(pauseTime);
    }
    
    await timeout(pauseTime);
}

const registerName = async(privateKey) => {
    const address = privateToAddress(privateKey);

    //REGISTER NAME .ERA
    try {
        await generateRandomName().then(async(name) => {
            console.log(chalk.magentaBright(`Name: ${name}.era`));
            logger.log(`Name: ${name}.era`);
            await dataRegisterName(info.rpc, name, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.NameService, 3 * 10**15, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Register Successful`));
                    logger.log(`Register Successful`);
                });
            });
            await timeout(pauseTime);
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }
} //+

const wrapETHSync = async(privateKey) => {
    const address = privateToAddress(privateKey);
    const random = generateRandomAmount(process.env.ETH_SWAP_PERCENT_MIN / 100, process.env.ETH_SWAP_PERCENT_MAX / 100, 3);

    try {
        await getETHAmount(info.rpc, address).then(async(amountETH) => {
            amountETH = parseInt(multiply(amountETH, random));

            await dataWrapETH(info.rpc, amountETH, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.WETH, amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Wrap Successful`));
                    logger.log(`Wrap Successful`);
                });
            });
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const unwrapETHSync = async(privateKey) => {
    const address = privateToAddress(privateKey);

    try {
        await getAmountToken(info.rpc, info.WETH, address).then(async(amountWETH) => {
            await dataUnwrapETH(info.rpc, amountWETH, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.WETH, null, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Unwrap Successful`));
                    logger.log(`Unwrap Successful`);
                });
            });
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
} //+

const izumiSwapETHInToken = async(privateKey, tokenName) => {
    const address = privateToAddress(privateKey);
    const random = generateRandomAmount(process.env.ETH_SWAP_PERCENT_MIN / 100, process.env.ETH_SWAP_PERCENT_MAX / 100, 3);
    const tokenAddress = info[tokenName];

    //SWAP ETH -> TOKEN
    console.log(chalk.yellow(`Swap ETH -> ${tokenName}`));
    logger.log(`Swap ETH -> ${tokenName}`);
    try {
        await getETHAmount(info.rpc, address).then(async(amountETH) => {
            amountETH = parseInt(multiply(amountETH, random));
            await dataSwapETHToTokenIzumi(info.rpc, amountETH, tokenAddress, 2000, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.IzumiRouter, amountETH, res.encodeABI, privateKey);
                    console.log(chalk.magentaBright(`Swap ETH -> ${tokenName} Successful`));
                    logger.log(`Swap ETH -> ${tokenName} Successful`);
                });
            });
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    return true;
}

const izumiSwapTokenInETH = async(privateKey, tokenName) => {
    const address = privateToAddress(privateKey);
    const tokenAddress = info[tokenName];

    //APPROVE TOKEN
    console.log(chalk.yellow(`Approve ${tokenName}`));
    logger.log(`Approve ${tokenName}`);
    try {
        await getAmountToken(info.rpc, tokenAddress, address).then(async(balance) => {
            await checkAllowance(info.rpc, tokenAddress, address, info.IzumiRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve ${tokenName} for Izumi Router`));
                    logger.log(`Start Approve ${tokenName} for Izumi Router`);
                    await dataApprove(info.rpc, tokenAddress, info.IzumiRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, tokenAddress, null, res1.encodeABI, privateKey);
                        });
                    });
                } else if (Number(res) >= balance) {
                    console.log(chalk.magentaBright(`Approve ${tokenName} Successful`));
                    logger.log(`Approve ${tokenName} Successful`);
                }
            });
        });
        await timeout(pauseTime);
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }

    //SWAP TOKEN -> ETH
    console.log(chalk.yellow(`SWAP ${tokenName} -> ETH`));
    logger.log(`SWAP ${tokenName} -> ETH`);
    try {
        await getAmountToken(info.rpc, tokenAddress, address).then(async(amountUSDC) => {
            await dataSwapTokenToETHIzumi(info.rpc, amountUSDC, tokenAddress, 2000, address).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.IzumiRouter, null, res.encodeABI, privateKey);
                    console.log(chalk.yellow(`Successful Swap`));
                });
            });
        });
    } catch (err) {
        logger.log(err);
        console.log(err.message);
        return;
    }
}

const getBalanceWallet = async(privateKey) => {
    const address = privateToAddress(privateKey);

    await getETHAmount(info.rpcMainet, address).then((res) => {
        console.log(chalk.magentaBright('Balance Ethereum'));
        console.log(`${res / 10**18}ETH`);
    });
    await getETHAmount(info.rpc, address).then(async(res) => {
        await getAmountToken(info.rpc, info.USDC, address).then(async(res1) => {
            console.log(chalk.magentaBright('Balance ZkSync'));
            console.log(`${res / 10**18}ETH`);
            console.log(`${res1 / 10**6}USDC`);
            await getAmountToken(info.rpc, info.LibertasNFT, address).then(async(res2) => {
                console.log(chalk.cyanBright('Libertas Omnibus Collection'));
                console.log(`${res2} NFT`);
            });
            await getAmountToken(info.rpc, info.LPPool, address).then(async(res2) => {
                console.log(chalk.cyanBright('SyncSwap ETH/USDC'));
                console.log(`${res2 / 10**6}LP`);
                await getAmountToken(info.rpc, info.OTLPPool, address).then(async(res3) => {
                    console.log(chalk.cyanBright('SyncSwap ETH/OT'));
                    console.log(`${res3 / 10**6}LP`);
                });
            });
            await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(res2) => {
                console.log(chalk.cyanBright('SpaceFi ETH/USDC'));
                console.log(`${res2 / 10**6}LP`);
                await getAmountToken(info.rpc, info.LPPoolSPACE, address).then(async(res3) => {
                    console.log(chalk.cyanBright('SpaceFi ETH/SPACE'));
                    console.log(`${res3 / 10**6}LP`);
                });
            });
            await getAmountBorrow(info.rpc, info.nUSDC, address).then(async(res2) => {
                console.log(chalk.cyanBright('Nexon Deposit USDC/ETH'));
                console.log(`${res2 / 10**6}nUSDC`);
                await getAmountBorrow(info.rpc, info.nETH, address).then(async(res3) => {
                    console.log(`${res3 / 10**6}nETH`);
                });
            });
        });
    });
    await getETHAmount(info.rpcArbitrum, address).then(async(res) => {
        console.log(chalk.magentaBright('Balance Arbitrum'));
        console.log(`${res / 10**18}ETH`);
    });
}

(async() => {
    const wallet = parseFile('private.txt');
    const mainStage = [
        'BRIDGE',
        'RANDOM',
        'ALL FUNC',
        'NFT',
        'Other DEX',
        'OTHER'
    ];
    const bridgeStage = [
        'Bridge ETH to ZkSync AMOUNT',
        'Bridge ETH to ZkSync PERCENT',
        'Bridge ETH to Ethereum',
    ];
    const randomStage = [
        'SyncSwap USDC [Swap, +LP], SpaceFi USDC [Swap, +LP, +Farming], SyncSwap OT [Swap, +LP], SpaceFi SPACE [Swap, +LP], NexonFinance USDC/ETH [Swap, Deposit, Borrow, Repay, Withdraw, Swap]',
        'SyncSwap USDC [-LP, Swap], SpaceFi USDC [-Farming, -LP, Swap], SyncSwap OT [-LP, Swap], SpaceFi SPACE [-LP, Swap]',
        'Random All [1 action per wallet]',
        'Random Without LP | SyncSwap [USDC/OT], SpaceFi [USDC/SPACE] 1 act per wallet',
        'Random Without LP | SyncSwap [USDC/OT], SpaceFi [USDC/SPACE] 1 act per wallet WITHOUT SWAP USDC -> ETH!!!',
        'Random Without LP | SyncSwap [USDC/OT], SpaceFi [USDC/SPACE] RANDOM All of Act per wallet',
        'Random Without LP | SyncSwap [USDC/OT], SpaceFi [USDC/SPACE] RANDOM All of Act per wallet WITHOUT SWAP USDC -> ETH!!!'
    ];
    const allStage = [
        'Swap ETH to USDC/Add liquidity SyncSwap',
        'Delete ETH/USDC liquidity/Swap USDC -> ETH SyncSwap',
        'Swap ETH to OT/Add liquidity SyncSwap',
        'Delete ETH/OT liquidity/Swap OT -> ETH SyncSwap',
        'Swap/Deposit/Borrow/Repay/Withdraw/Swap USDC Nexon Finance',
        'Deposit/Withdraw ETH Nexon Finance',
        'Swap/Add liquidity/Deposit LP to farm SpaceFi',
        'Withdraw LP/Delete liquidity/Swap USDC -> ETH SpaceFi',
        'Swap/Add liquidity ETH/SPACE SpaceFi',
        'Delete liquidity/Swap SPACE -> ETH SpaceFi',
        'Wrap ETH SyncSwap',
        'Unwrap ETH SyncSwap',
    ];
    const nftStage = [
        'Register Random name.era 0.003ETH',
    ];
    const otherDEX = [
        'Izumi Swap ETH -> USDC [in %]',
        'Izumi Swap All USDC -> ETH',
        'Izumi Swap ETH -> IZI [in %]',
        'Izumi Swap All IZI -> ETH',
    ];
    const otherStage = [
        'SyncSwap ETH <-> USDC Without adding LP',
        'SyncSwap ETH <-> OT Without adding LP',
        'SpaceFi ETH <-> USDC Without adding LP',
        'SpaceFi ETH <-> SPACE Without adding LP',
        'SyncSwap Swap ETH -> USDC [Random in config]',
        'SyncSwap Swap All USDC -> ETH',
        'View balance address',
    ];
    const randomPartAll = [
        syncSwapStart,
        syncSwapEnd,
        spaceFiStart,
        spaceFiEnd,
        nexonFinanceStart,
        syncSwapOTStart,
        syncSwapOTEnd,
        nexonFinanceETHStart,
        spaceFiStartSPACE,
        spaceFiEndSPACE
    ];
    const randomPartStart = [syncSwapStart, spaceFiStart, nexonFinanceStart, syncSwapOTStart, nexonFinanceETHStart, spaceFiStartSPACE];
    const randomPartEnd = [syncSwapEnd, spaceFiEnd, syncSwapOTEnd, spaceFiEndSPACE];
    const randomPartWithoutLiq = [syncSwapOTWithoutLiq, syncSwapWithoutLiq, spaceFiSPACEWithoutLiq, spaceFiWithoutLiq];

    const index = readline.keyInSelect(mainStage, 'Choose stage!');
    let index1;
    let index2;
    let index3;
    let index4;
    let index5;
    let index6;
    if (index == -1) { process.exit() };
    console.log(chalk.green(`Start ${mainStage[index]}`));
    logger.log(`Start ${mainStage[index]}`);
    if (index == 0) {
        index1 = readline.keyInSelect(bridgeStage, 'Choose stage!');
        if (index1 == -1) { process.exit() };
        console.log(chalk.green(`Start ${bridgeStage[index1]}`));
        logger.log(`Start ${bridgeStage[index1]}`);
    } else if (index == 1) {
        index2 = readline.keyInSelect(randomStage, 'Choose stage!');
        if (index2 == -1) { process.exit() };
        console.log(chalk.green(`Start ${randomStage[index2]}`));
        logger.log(`Start ${randomStage[index2]}`);
    } else if (index == 2) {
        index3 = readline.keyInSelect(allStage, 'Choose stage!');
        if (index3 == -1) { process.exit() };
        console.log(chalk.green(`Start ${allStage[index3]}`));
        logger.log(`Start ${allStage[index3]}`);
    } else if (index == 3) {
        index4 = readline.keyInSelect(nftStage, 'Choose stage!');
        if (index4 == -1) { process.exit() };
        console.log(chalk.green(`Start ${nftStage[index4]}`));
        logger.log(`Start ${nftStage[index4]}`);
    } else if (index == 4) {
        index5 = readline.keyInSelect(otherDEX, 'Choose stage!');
        if (index5 == -1) { process.exit() };
        console.log(chalk.green(`Start ${otherDEX[index5]}`));
        logger.log(`Start ${otherDEX[index5]}`);
    } else if (index == 5) {
        index6 = readline.keyInSelect(otherStage, 'Choose stage!');
        if (index6 == -1) { process.exit() };
        console.log(chalk.green(`Start ${otherStage[index6]}`));
        logger.log(`Start ${otherStage[index6]}`);
    }
    
    for (let i = 0; i < wallet.length; i++) {
        let pauseWalletTime = generateRandomAmount(process.env.TIMEOUT_WALLET_SEC_MIN * 1000, process.env.TIMEOUT_WALLET_SEC_MAX * 1000, 0);
        try {
            console.log(chalk.blue(`Wallet ${i+1}: ${privateToAddress(wallet[i])}`));
            logger.log(`Wallet ${i+1}: ${privateToAddress(wallet[i])}`);
        } catch (err) { throw new Error('Error: Add Private Keys!') };

        if (index1 == 0) { //BRIDGE STAGE
            await bridgeETHToZkSync(wallet[i], 0);
        } else if (index1 == 1) {
            await bridgeETHToZkSync(wallet[i], 1);
        } else if (index1 == 2) {
            await bridgeETHToEthereum(wallet[i]);
        }
        
        if (index2 == 0) { //RANDOM STAGE
            shuffle(randomPartStart);
            for (let s = 0; s < randomPartStart.length; s++) {
                await randomPartStart[s](wallet[i], true);
            }
        } else if (index2 == 1) {
            shuffle(randomPartEnd);
            for (let s = 0; s < randomPartEnd.length; s++) {
                await randomPartEnd[s](wallet[i]);
            }
        } else if (index2 == 2) {
            let isReady;
            while(!isReady) {
                const random = generateRandomAmount(0, randomPartAll.length - 1, 0);
                await randomPartAll[random](wallet[i], true).then(async(res) => {
                    if (res) {
                        isReady = true;
                    } else if (!res) {
                        console.log(`Cannot perform ${random + 1} action, try a new one`);
                        logger.log(`Cannot perform ${random + 1} action, try a new one`);
                        await timeout(pauseTime);
                    }
                });
            }
        } else if (index2 == 3) {
            shuffle(randomPartWithoutLiq);
            await randomPartWithoutLiq[0](wallet[i], true);
        } else if (index2 == 4) {
            shuffle(randomPartWithoutLiq);
            await randomPartWithoutLiq[0](wallet[i], false);
        } else if (index2 == 5) {
            shuffle(randomPartWithoutLiq);
            const numberAction = generateRandomAmount(1, randomPartWithoutLiq.length, 0);
            for (let n = 0; n < numberAction; n++) {
                await randomPartWithoutLiq[generateRandomAmount(0, randomPartWithoutLiq.length - 1, 0)](wallet[i], true);
            }
        } else if (index2 == 6) {
            shuffle(randomPartWithoutLiq);
            const numberAction = generateRandomAmount(1, randomPartWithoutLiq.length, 0);
            for (let n = 0; n < numberAction; n++) {
                await randomPartWithoutLiq[generateRandomAmount(0, randomPartWithoutLiq.length - 1, 0)](wallet[i], false);
            }
        }
        
        if (index3 == 0) { //ALL FUNCTION
            await syncSwapStart(wallet[i]);
        } else if (index3 == 1) {
            await syncSwapEnd(wallet[i]);
        } else if (index3 == 2) {
            await syncSwapOTStart(wallet[i]);
        } else if (index3 == 3) {
            await syncSwapOTEnd(wallet[i]);
        } else if (index3 == 4) {
            await nexonFinanceStart(wallet[i], true);
        } else if (index3 == 5) {
            await nexonFinanceETHStart(wallet[i]);
        } else if (index3 == 6) {
            await spaceFiStart(wallet[i]);
        } else if (index3 == 7) {
            await spaceFiEnd(wallet[i]);
        } else if (index3 == 8) {
            await spaceFiStartSPACE(wallet[i]);
        } else if (index3 == 9) {
            await spaceFiEndSPACE(wallet[i]);
        } else if (index3 == 10) {
            await wrapETHSync(wallet[i]);
        } else if (index3 == 11) {
            await unwrapETHSync(wallet[i]);
        }
        
        if (index4 == 0) { //NFT STAGE
            await registerName(wallet[i]);
        }

        if (index5 == 0) { //OTHER DEX STAGE
            await izumiSwapETHInToken(wallet[i], 'USDC');
        } else if (index5 == 1) {
            await izumiSwapTokenInETH(wallet[i], 'USDC');
        } else if (index5 == 2) {
            await izumiSwapETHInToken(wallet[i], 'IZI');
        } else if (index5 == 3) {
            await izumiSwapTokenInETH(wallet[i], 'IZI');
        }
        
        if (index6 == 0) { //OTHER STAGE
            await syncSwapWithoutLiq(wallet[i], true);
        } else if (index6 == 1) {
            await syncSwapOTWithoutLiq(wallet[i]);
        } else if (index6 == 2) {
            await spaceFiWithoutLiq(wallet[i], true);
        } else if (index6 == 3) {
            await spaceFiSPACEWithoutLiq(wallet[i]);
        } else if (index6 == 4) {
            await syncSwapETHToUSDC(wallet[i]);
        } else if (index6 == 5) {
            await syncSwapUSDCToETH(wallet[i]);
        } else if (index6 == 6) {
            pauseWalletTime = 0;
            await getBalanceWallet(wallet[i]);
        }

        await timeout(pauseWalletTime);
    }
    console.log(chalk.bgMagentaBright('Process End!'));
    logger.log('Process End!');
})();
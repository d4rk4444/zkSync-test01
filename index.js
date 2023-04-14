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
    dataDeleteLiquidityToken} from './tools/syncSwap.js';
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
const pauseWalletTime = generateRandomAmount(process.env.TIMEOUT_WALLET_SEC_MIN * 1000, process.env.TIMEOUT_WALLET_SEC_MAX * 1000, 0);
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

    let isReady;
    while(!isReady) {
        //SWAP ETH -> USDC
        console.log(chalk.yellow(`Swap ETH -> USDC`));
        logger.log(`Swap ETH -> USDC`);
        try {
            await dataSwapETHToToken(info.rpc, info.USDC, amountETH, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
            
        await getAmountToken(info.rpc, info.USDC, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Swap, try again`));
                logger.log(`Error Swap, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                logger.log(`Swap ETH -> USDC Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE USDC
        console.log(chalk.yellow(`Approve USDC`));
        logger.log(`Approve USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Router`));
                    logger.log(`Start Approve USDC for Router`);
                    await dataApprove(info.rpc, info.USDC, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            try {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                            } catch (err) {
                                logger.log(err.message);
                                console.log(err.message);
                                await timeout(pauseTime);
                            }
                        });
                    });
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //ADD LIQUIDITY ETH/USDC
        console.log(chalk.yellow(`Add Liqidity ETH/USDC`));
        logger.log(`Add Liqidity ETH/USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            try {
                await dataAddLiquidity(info.rpc, info.LPPool, amountUSDC, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, res.amountETH, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }      
        });
        
        await getAmountToken(info.rpc, info.LPPool, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Add Liqidity, try again`));
                logger.log(`Error Add Liqidity, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Add Liqidity Successful`));
                logger.log(`Add Liqidity Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const syncSwapEnd = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap End'));
    logger.log('Start SyncSwap End');
    const address = privateToAddress(privateKey);
    const checkBalance = await getAmountToken(info.rpc, info.LPPool, address);
    if (checkBalance == 0) {
        return false;
    }

    let isReady;
    while(!isReady) {
        //APPROVE LP
        console.log(chalk.yellow(`Approve LP`));
        logger.log(`Approve LP`);
        await getAmountToken(info.rpc, info.LPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.LPPool, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve LP for Router`));
                    logger.log(`Start Approve LP for Router`);
                    try {
                        await dataApprove(info.rpc, info.LPPool, info.SSRouter, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.LPPool, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }
                        
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve LP Successful`));
                    logger.log(`Approve LP Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //WITHDRAW LIQUIDITY ETH/USDC
        console.log(chalk.yellow(`Withdraw Liqidity ETH/USDC`));
        logger.log(`Withdraw Liqidity ETH/USDC`);
        await getAmountToken(info.rpc, info.LPPool, address).then(async(amountLP) => {
            try {
                await dataDeleteLiquidity(info.rpc, info.LPPool, amountLP, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, res.amountETH, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
            
        
        await getAmountToken(info.rpc, info.LPPool, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Withdraw Liqidity, try again`));
                logger.log(`Error Withdraw Liqidity, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Withdraw Liqidity Successful`));
                logger.log(`Withdraw Liqidity Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const syncSwapOTStart = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap ETH/OT'));
    logger.log('Start SyncSwap ETH/OT');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    let isReady;
    while(!isReady) {
        //SWAP ETH -> OT
        console.log(chalk.yellow(`Swap ETH -> OT`));
        logger.log(`Swap ETH -> OT`);
        try {
            await dataSwapETHToToken(info.rpc, info.OT, amountETH, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
            
        await getAmountToken(info.rpc, info.OT, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Swap, try again`));
                logger.log(`Error Swap, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Swap ETH -> OT Successful`));
                logger.log(`Swap ETH -> OT Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE OT
        console.log(chalk.yellow(`Approve OT`));
        logger.log(`Approve OT`);
        await getAmountToken(info.rpc, info.OT, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.OT, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve OT for Router`));
                    logger.log(`Start Approve OT for Router`);
                    await dataApprove(info.rpc, info.OT, info.SSRouter, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            try {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.OT, null, res1.encodeABI, privateKey);
                            } catch (err) {
                                logger.log(err.message);
                                console.log(err.message);
                                await timeout(pauseTime);
                            }
                        });
                    });
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve OT Successful`));
                    logger.log(`Approve OT Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //ADD LIQUIDITY ETH/OT
        console.log(chalk.yellow(`Add Liqidity ETH/OT`));
        logger.log(`Add Liqidity ETH/OT`);
        await getAmountToken(info.rpc, info.OT, address).then(async(amountOT) => {
            try {
                await dataAddLiquidityToken(info.rpc, info.OTLPPool, info.OT, amountOT, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, res.amountETH, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err);
                await timeout(pauseTime);
            }
        });
        
        await getAmountToken(info.rpc, info.OTLPPool, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Add Liqidity, try again`));
                logger.log(`Error Add Liqidity, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Add Liqidity Successful`));
                logger.log(`Add Liqidity Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const syncSwapOTEnd = async(privateKey) => {
    console.log(chalk.cyan('Start SyncSwap OT End'));
    logger.log('Start SyncSwap OT End');
    const address = privateToAddress(privateKey);
    const checkBalance = await getAmountToken(info.rpc, info.OTLPPool, address);
    if (checkBalance == 0) {
        return false;
    }

    let isReady;
    while(!isReady) {
        //APPROVE OT LP
        console.log(chalk.yellow(`Approve OT LP`));
        logger.log(`Approve OT LP`);
        await getAmountToken(info.rpc, info.OTLPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.OTLPPool, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve OT LP for Router`));
                    logger.log(`Start Approve OT LP for Router`);
                    try {
                        await dataApprove(info.rpc, info.OTLPPool, info.SSRouter, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.OTLPPool, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }
                        
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve OT LP Successful`));
                    logger.log(`Approve OT LP Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //WITHDRAW LIQUIDITY ETH/OT
        console.log(chalk.yellow(`Withdraw Liqidity ETH/OT`));
        logger.log(`Withdraw Liqidity ETH/OT`);
        await getAmountToken(info.rpc, info.OTLPPool, address).then(async(amountLP) => {
            try {
                await dataDeleteLiquidityToken(info.rpc, info.OTLPPool, amountLP, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
            
        
        await getAmountToken(info.rpc, info.OTLPPool, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Withdraw ETH/OT Liqidity, try again`));
                logger.log(`Error Withdraw ETH/OT Liqidity, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Withdraw ETH/OT Liqidity Successful`));
                logger.log(`Withdraw ETH/OT Liqidity Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const spaceFiStart = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi'));
    logger.log('Start SpaceFi');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    let isReady;
    while(!isReady) {
        //SWAP ETH -> USDC
        console.log(chalk.yellow(`Swap ETH -> USDC`));
        logger.log(`Swap ETH -> USDC`);
        try {
            await dataSpaceSwapETHToToken(info.rpc, info.WETH, info.USDC, amountETH, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, amountETH, res.encodeABI, privateKey);
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
            
        await getAmountToken(info.rpc, info.USDC, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Swap, try again`));
                logger.log(`Error Swap, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Swap ETH -> USDC Successful`));
                logger.log(`Swap ETH -> USDC Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE USDC
        console.log(chalk.yellow(`Approve USDC`));
        logger.log(`Approve USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for Space Router`));
                    logger.log(`Start Approve USDC for Space Router`);
                    try {
                        await dataApprove(info.rpc, info.USDC, info.SpaceRouter, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve USDC Successful`));
                    logger.log(`Approve USDC Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //ADD LIQUIDITY ETH/USDC
        console.log(chalk.yellow(`Space Add Liqidity ETH/USDC`));
        logger.log(`Space Add Liqidity ETH/USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            try {
                await dataSpaceAddLiquidityETH(info.rpc, amountUSDC, info.USDC, address, 0.98).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, res.amountETH, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
        
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Space Add Liqidity, try again`));
                logger.log(`Error Space Add Liqidity, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Space Add Liqidity Successful`));
                logger.log(`Space Add Liqidity Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE LP FOR FARM
        console.log(chalk.yellow(`Approve LP`));
        logger.log(`Approve LP`);
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.SpaceLPPool, address, info.SpaceFarmer).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve LP for Space Farmer`));
                    logger.log(`Start Approve LP for Space Farmer`);
                    try {
                        await dataApprove(info.rpc, info.SpaceLPPool, info.SpaceFarmer, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SpaceLPPool, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }   
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve LP Successful`));
                    logger.log(`Approve LP Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //DEPOSIT LP TO SPACE FARM
        console.log(chalk.yellow(`DEPOSIT LP TO FARM`));
        logger.log(`DEPOSIT LP TO FARM`);
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(amountLP) => {  
            try {
                await dataSpaceDeposit(info.rpc, amountLP, address).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceFarmer, res.amountETH, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
    
        
        await getSpaceFarmAmount(info.rpc, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Space Deposit LP, try again`));
                logger.log(`Error Space Deposit LP, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Space Deposit LP Successful`));
                logger.log(`Space Deposit LP Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const spaceFiEnd = async(privateKey) => {
    console.log(chalk.cyan('Start SpaceFi End [Withdraw, Delete Liquidity, Swap USDC -> ETH]'));
    logger.log('Start SpaceFi End [Withdraw, Delete Liquidity, Swap USDC -> ETH]');
    const address = privateToAddress(privateKey);
    const checkBalance = await getSpaceFarmAmount(info.rpc, address);
    if (checkBalance == 0) {
        return false;
    }

    let isReady;
    while(!isReady) {
        //WITHDRAW LP FROM SPACE FARMER
        console.log(chalk.yellow(`WITHDRAW LP FROM SPACE FARMER`));
        logger.log(`WITHDRAW LP FROM SPACE FARMER`);
        await getSpaceFarmAmount(info.rpc, address).then(async(res) => {
            try {
                await dataSpaceWithdraw(info.rpc, res, address).then(async(res1) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SpaceFarmer, null, res1.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }   
        });

        await getSpaceFarmAmount(info.rpc, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Withdraw LP, try again`));
                logger.log(`Error Withdraw LP, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Withdraw LP Successful`));
                logger.log(`Withdraw LP Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE SPACE LP
        console.log(chalk.yellow(`Approve Space LP`));
        logger.log(`Approve Space LP`);
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.SpaceLPPool, address, info.SpaceRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve LP for Space Router`));
                    logger.log(`Start Approve LP for Space Router`);
                    try {
                        await dataApprove(info.rpc, info.SpaceLPPool, info.SpaceRouter, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.SpaceLPPool, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }       
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve Space LP Successful`));
                    logger.log(`Approve Space LP Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //DELETE LIQUIDITY SPACE
        console.log(chalk.yellow(`DELETE LIQUIDITY SPACE`));
        logger.log(`DELETE LIQUIDITY SPACE`);
        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(amountLP) => {   
            try {
                await dataSpaceDeleteLiquidityETH(info.rpc, info.USDC, amountLP, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }        
        });

        await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Delete Liquidity Space LP, try again`));
                logger.log(`Error Delete Liquidity Space LP, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Delete Liquidity Space LP Successful`));
                logger.log(`Delete Liquidity Space LP Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //SWAP SPACE USDC -> ETH
        console.log(chalk.yellow(`SWAP SPACE USDC -> ETH`));
        logger.log(`SWAP SPACE USDC -> ETH`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            try {
                await dataSpaceSwapTokenToETH(info.rpc, info.USDC, info.WETH, amountUSDC, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SpaceRouter, null, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
        
        await getAmountToken(info.rpc, info.USDC, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Swap Space USDC -> ETH, try again`));
                logger.log(`Error Swap Space USDC -> ETH, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Swap Space USDC -> ETH Successful`));
                logger.log(`Swap Space USDC -> ETH Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const nexonFinanceStart = async(privateKey) => {
    console.log(chalk.cyan('Start Nexon Finance [Swap/Deposit/Borrow/Repay/Withdraw]'));
    logger.log('Start Nexon Finance [Swap/Deposit/Borrow/Repay/Withdraw]');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    let isReady;
    while(!isReady) {
        //SWAP ETH -> USDC
        console.log(chalk.yellow(`Swap ETH -> USDC`));
        logger.log(`Swap ETH -> USDC`);
        try {
            await dataSwapETHToToken(info.rpc, info.USDC, amountETH, info.SSRouter, address, slippage).then(async(res) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, amountETH, res.encodeABI, privateKey);
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
            
        await getAmountToken(info.rpc, info.USDC, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Swap, try again`));
                logger.log(`Error Swap, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Swap Successful`));
                logger.log(`Swap Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //Enter Markets USDC
        console.log(chalk.yellow(`Enter Markets USDC`));
        logger.log(`Enter Markets USDC`);
        
        await checkMembership(info.rpc, info.Unitoller, address, info.nUSDC).then(async(res) => {
            if (!res) { 
                try {
                    await dataEnterMarkets(info.rpc, info.Unitoller, info.nUSDC, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.Unitoller, null, res1.encodeABI, privateKey);
                        });
                    });
                } catch (err) {
                    logger.log(err.message);
                    console.log(err.message);
                    await timeout(pauseTime);
                }    
            } else if (res) {
                isReady = true;
                console.log(chalk.magentaBright(`Enter Markets Successful`));
                logger.log(`Enter Markets Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE USDC
        console.log(chalk.yellow(`Approve USDC`));
        logger.log(`Approve USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.nUSDC).then(async(res) => {
                if (Number(res) < balance) {
                    try {
                        await dataApprove(info.rpc, info.USDC, info.nUSDC, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }  
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve Successful`));
                    logger.log(`Approve Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //SUPPLY USDC
        console.log(chalk.yellow(`SUPPLY USDC`));
        logger.log(`SUPPLY USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            try {
                await dataSupplyNexon(info.rpc, info.nUSDC, amountUSDC, address).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nUSDC, null, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }    
        });
        
        await getAmountToken(info.rpc, info.nUSDC, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Supply USDC, try again`));
                logger.log(`Error Supply USDC, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Supply Successful`));
                logger.log(`Supply Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //BORROW USDC
        console.log(chalk.yellow(`BORROW USDC`));
        logger.log(`BORROW USDC`);
        await getAmountDeposit(info.rpc, info.nUSDC, address).then(async(amountUSDC) => {
            const supplyBorrow = parseFloat((1 - generateRandomAmount(1 - process.env.SLIPPAGE_BORROW_MIN / 100, 1 - process.env.SLIPPAGE_BORROW_MAX / 100, 2))).toFixed(2);
            amountUSDC = parseInt(amountUSDC * supplyBorrow);
            try {
                await dataBorrowNexon(info.rpc, info.nUSDC, amountUSDC, address).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nUSDC, null, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }       
        });
        
        await getAmountBorrow(info.rpc, info.nUSDC, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Borrow USDC, try again`));
                logger.log(`Error Borrow USDC, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Borrow Successful`));
                logger.log(`Borrow Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //REPAY USDC
        console.log(chalk.yellow(`REPAY USDC`));
        logger.log(`REPAY USDC`);
        try {
            await getAmountToken(info.rpc, info.USDC, address).then(async(res1) => {
                await dataRepayNexon(info.rpc, info.nUSDC, res1, address).then(async(res2) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res2.estimateGas, gasPrice, info.nUSDC, null, res2.encodeABI, privateKey);
                    });
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
        
        await getAmountToken(info.rpc, info.USDC, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Repay USDC, try again`));
                logger.log(`Error Repay USDC, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Repay Successful`));
                logger.log(`Repay Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //WITHDRAW USDC
        console.log(chalk.yellow(`WITHDRAW USDC`));
        logger.log(`WITHDRAW USDC`);
        try {
            await getAmountRedeem(info.rpc, info.nUSDC, address).then(async(amountRedeem) => {
                await dataRedeemNexon(info.rpc, info.nUSDC, amountRedeem, address).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nUSDC, null, res.encodeABI, privateKey);
                    });
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }     
        
        await getAmountRedeem(info.rpc, info.nUSDC, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Withdraw USDC, try again`));
                logger.log(`Error Withdraw USDC, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Withdraw Successful`));
                logger.log(`Withdraw Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //APPROVE USDC SYNCSWAP
        console.log(chalk.yellow(`Approve USDC`));
        logger.log(`Approve USDC`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(balance) => {
            await checkAllowance(info.rpc, info.USDC, address, info.SSRouter).then(async(res) => {
                if (Number(res) < balance) {
                    console.log(chalk.yellow(`Start Approve USDC for SyncSwap`));
                    logger.log(`Start Approve USDC for SyncSwap`);
                    try {
                        await dataApprove(info.rpc, info.USDC, info.SSRouter, address).then(async(res1) => {
                            await getGasPrice(info.rpc).then(async(gasPrice) => {
                                await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.USDC, null, res1.encodeABI, privateKey);
                            });
                        });
                    } catch (err) {
                        logger.log(err.message);
                        console.log(err.message);
                        await timeout(pauseTime);
                    }       
                } else if (Number(res) >= balance) {
                    isReady = true;
                    console.log(chalk.magentaBright(`Approve USDC SyncSwap Successful`));
                    logger.log(`Approve USDC SyncSwap Successful`);
                    await timeout(pauseTime);
                }
            });
        });
    }

    isReady = false;
    while(!isReady) {
        //SWAP USDC -> ETH
        console.log(chalk.yellow(`SWAP USDC -> ETH`));
        logger.log(`SWAP USDC -> ETH`);
        await getAmountToken(info.rpc, info.USDC, address).then(async(amountUSDC) => {
            try {
                await dataSwapTokenToETH(info.rpc, info.USDC, amountUSDC, info.SSRouter, address, slippage).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.SSRouter, null, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
        
        await getAmountToken(info.rpc, info.USDC, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Swap USDC -> ETH, try again`));
                logger.log(`Error Swap USDC -> ETH, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Swap USDC -> ETH Successful`));
                logger.log(`Swap USDC -> ETH Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const nexonFinanceETHStart = async(privateKey) => {
    console.log(chalk.cyan('Start Nexon Finance ETH [Deposit/Borrow]'));
    logger.log('Start Nexon Finance [Deposit/Borrow]');
    const address = privateToAddress(privateKey);
    const amountETH = generateRandomAmount(process.env.ETH_SWAP_MIN * 10**18, process.env.ETH_SWAP_MAX * 10**18, 0);

    let isReady;
    while(!isReady) {
        //Enter Markets USDC
        console.log(chalk.yellow(`Enter Markets ETH`));
        logger.log(`Enter Markets ETH`);
        
        await checkMembership(info.rpc, info.Unitoller, address, info.nETH).then(async(res) => {
            if (!res) { 
                try {
                    await dataEnterMarkets(info.rpc, info.Unitoller, info.nETH, address).then(async(res1) => {
                        await getGasPrice(info.rpc).then(async(gasPrice) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.Unitoller, null, res1.encodeABI, privateKey);
                        });
                    });
                } catch (err) {
                    logger.log(err.message);
                    console.log(err.message);
                    await timeout(pauseTime);
                }    
            } else if (res) {
                isReady = true;
                console.log(chalk.magentaBright(`Enter Markets ETH Successful`));
                logger.log(`Enter Markets ETH Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //SUPPLY ETH
        console.log(chalk.yellow(`SUPPLY ETH`));
        logger.log(`SUPPLY ETH`);
        await getETHAmount(info.rpc, address).then(async(amountETH) => {
            try {
                amountETH = parseInt(multiply(amountETH, generateRandomAmount(0.2, 0.4, 2)));
                await dataSupplyNexon(info.rpc, info.nETH, amountETH, address).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nETH, amountETH, res.encodeABI, privateKey);
                    });
                });
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }    
        });
        
        await getAmountToken(info.rpc, info.nETH, address).then(async(res) => {
            if (res == 0) {
                console.log(chalk.red(`Error Supply ETH, try again`));
                logger.log(`Error Supply ETH, try again`);
            } else if (res > 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Supply ETH Successful`));
                logger.log(`Supply ETH Successful`);
                await timeout(pauseTime);
            }
        });
    }

    isReady = false;
    while(!isReady) {
        //WITHDRAW ETH
        console.log(chalk.yellow(`WITHDRAW ETH`));
        logger.log(`WITHDRAW ETH`);
        try {
            await getAmountRedeem(info.rpc, info.nETH, address).then(async(amountRedeem) => {
                await dataRedeemNexon(info.rpc, info.nETH, amountRedeem, address).then(async(res) => {
                    await getGasPrice(info.rpc).then(async(gasPrice) => {
                        await sendZkSyncTX(info.rpc, res.estimateGas, gasPrice, info.nETH, null, res.encodeABI, privateKey);
                    });
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }     
        
        await getAmountRedeem(info.rpc, info.nETH, address).then(async(res) => {
            if (res > 0) {
                console.log(chalk.red(`Error Withdraw ETH, try again`));
                logger.log(`Error Withdraw ETH, try again`);
            } else if (res == 0) {
                isReady = true;
                console.log(chalk.magentaBright(`Withdraw ETH Successful`));
                logger.log(`Withdraw ETH Successful`);
                await timeout(pauseTime);
            }
        });
    }

    return true;
}

const nexonFinanceEnd = async(privateKey) => {
    /*console.log(chalk.cyan('Start Nexon Finance [Repay/Withdraw/Swap]'));
    logger.log('Start Nexon Finance [Repay/Withdraw/Swap]');
    const address = privateToAddress(privateKey);
    const checkBalance = await getAmountBorrow(info.rpc, info.nUSDC, address);
    if (checkBalance == 0) {
        return false;
    }*/
}

const bridgeETHToEthereum = async(privateKey) => {
    const addressETH = privateToAddress(privateKey);

    await getETHAmount(info.rpc, addressETH).then(async(amountETH) => {
        try {
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
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
    });
    
    await timeout(pauseTime);
}

const withdrawETHToSubWallet = async(toAddress, privateKey) => {
    const addressEthereum = privateToAddress(privateKey);
    await getETHAmount(info.rpcMainet, addressEthereum).then(async(res) => {
        await getGasPriceEthereum().then(async(res1) => {
            let amountETH = subtract(res, 21000 * multiply(add(res1.maxFee, res1.maxPriorityFee), 10**9));
            amountETH = subtract(amountETH, generateRandomAmount(1 * 10**12, 3 * 10**12, 0));
            try {
                await sendETHTX(info.rpcMainet, 21000, res1.maxFee, res1.maxPriorityFee, toAddress, amountETH, null, privateKey);
                console.log(chalk.yellow(`Send ${amountETH / 10**18}ETH to ${toAddress} OKX`));
                logger.log(`Send ${amountETH / 10**18}ETH to ${toAddress} OKX`);
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
    });
}

const bridgeETHToArbitrumOrbiter = async(privateKey) => {
    const addressETH = privateToAddress(privateKey);

    let isReady;
    while(!isReady) {
        try {
            await getETHAmount(info.rpc, addressETH).then(async(amountETH) => {
                await getGasPrice(info.rpc).then(async(gasPrice) => {
                    await dataSendToken(info.rpc, info.ETH, orbiter.routerETH, '1', addressETH).then(async(res) => {
                        const amountFee = add(multiply(res.estimateGas, gasPrice * 10**9), orbiter.Arbitrum.holdFee);
                        const random = generateRandomAmount(process.env.PERCENT_BRIDGE_TO_ETHEREUM_MIN / 100, process.env.PERCENT_BRIDGE_TO_ETHEREUM_MAX / 100, 3);
                        amountETH = parseInt(multiply(subtract(amountETH, amountFee), random) / 10**4).toString() + orbiter.Arbitrum.chainId;
                        console.log(chalk.yellow(`Bridge ${amountETH / 10**18}ETH to Arbitrum`));
                        logger.log(`Bridge ${amountETH / 10**18}ETH to Arbitrum`);
                        await dataSendToken(info.rpc, info.ETH, orbiter.routerETH, amountETH, addressETH).then(async(res1) => {
                            await sendZkSyncTX(info.rpc, res1.estimateGas, gasPrice, info.ETH, amountETH, res1.encodeABI, privateKey);
                            isReady = true;
                        });
                    });
                });
            });
        } catch (err) {
            logger.log(err.message);
            console.log(err.message);
            await timeout(pauseTime);
        }
    }
}

const withdrawETHToSubWalletArbitrum = async(toAddress, privateKey) => {
    const addressETH = privateToAddress(privateKey);

    await getETHAmount(info.rpcArbitrum, addressETH).then(async(amountETH) => {
        await getGasPrice(info.rpcArbitrum).then(async(gasPrice) => {
            gasPrice = (parseInt(multiply(gasPrice, 1.2))).toString();
            amountETH = subtract(amountETH, 1100000 * multiply(gasPrice, 10**9));
            try {
                await sendArbitrumTX(info.rpcArbitrum, generateRandomAmount(900000, 1000000, 0), gasPrice, gasPrice, toAddress, amountETH, null, privateKey);
                console.log(chalk.yellow(`Send ${amountETH / 10**18}ETH to ${toAddress} Arbitrum`));
                logger.log(`Send ${amountETH / 10**18}ETH to ${toAddress} Arbitrum`);
            } catch (err) {
                logger.log(err.message);
                console.log(err.message);
                await timeout(pauseTime);
            }
        });
    });
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
            await getAmountToken(info.rpc, info.LPPool, address).then(async(res2) => {
                console.log(chalk.cyanBright('SyncSwap'));
                console.log(`${res2 / 10**6}LP`);
            });
            await getAmountToken(info.rpc, info.SpaceLPPool, address).then(async(res2) => {
                console.log(chalk.cyanBright('SpaceFi'));
                console.log(`${res2 / 10**6}LP`);
                await getAmountBorrow(info.rpc, info.nUSDC, address).then(async(res3) => {

                });
            });
        });
    });
}

(async() => {
    const wallet = parseFile('private.txt');
    const mainStage = [
        'BRIDGE',
        'RANDOM',
        'ALL FUNC',
        'OTHER'
    ];
    const bridgeStage = [
        'Bridge ETH to ZkSync AMOUNT',
        'Bridge ETH to ZkSync PERCENT',
        'Bridge ETH to Ethereum',
        'Bridge ETH to Arbitrum [Orbiter]',
        'Send to SubWallet Ethereum',
        'Send to SubWallet Arbitrum'
    ];
    const randomStage = [
        'SyncSwap USDC [Swap, +LP], SpaceFi [Swap, +LP, +Farming], SyncSwap OT [Swap, +LP], NexonFinance[Swap, Deposit, Borrow, Repay, Withdraw, Swap]',
        'SyncSwap USDC [-LP, Swap], SpaceFi [-Farming, -LP, Swap], SyncSwap OT [-LP, Swap]',
        'Random All [1 action per wallet that can perform]'
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
    ];
    const otherStage = [
        'View balance address',
    ];
    const randomPartAll = [syncSwapStart, syncSwapEnd, spaceFiStart, spaceFiEnd, nexonFinanceStart, syncSwapOTStart, syncSwapOTEnd, nexonFinanceETHStart];
    const randomPartStart = [syncSwapStart, spaceFiStart, nexonFinanceStart, syncSwapOTStart, nexonFinanceETHStart];
    const randomPartEnd = [syncSwapEnd, spaceFiEnd, syncSwapOTEnd];

    const index = readline.keyInSelect(mainStage, 'Choose stage!');
    let index1;
    let index2;
    let index3;
    let index4;
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
        index4 = readline.keyInSelect(otherStage, 'Choose stage!');
        if (index4 == -1) { process.exit() };
        console.log(chalk.green(`Start ${otherStage[index4]}`));
        logger.log(`Start ${otherStage[index4]}`);
    }
    
    for (let i = 0; i < wallet.length; i++) {
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
        } else if (index1 == 3) {
            await bridgeETHToArbitrumOrbiter(wallet[i]);
        } else if (index1 == 4) {
            const walletOKX = parseFile('subWallet.txt');
            await withdrawETHToSubWallet(walletOKX[i], wallet[i]);
        } else if (index1 == 5) {
            const walletOKX = parseFile('subWallet.txt');
            await withdrawETHToSubWalletArbitrum(walletOKX[i], wallet[i]);
        } else if (index2 == 0) { //RANDOM STAGE
            shuffle(randomPartStart);
            for (let s = 0; s < randomPartStart.length; s++) {
                await randomPartStart[s](wallet[i]);
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
                await randomPartAll[random](wallet[i]).then(async(res) => {
                    if (res) {
                        isReady = true;
                    } else if (!res) {
                        console.log(`Cannot perform ${random + 1} action, try a new one`);
                        logger.log(`Cannot perform ${random + 1} action, try a new one`);
                        await timeout(pauseTime);
                    }
                });
            }
        } else if (index3 == 0) { //ALL FUNCTION
            await syncSwapStart(wallet[i]);
        } else if (index3 == 1) {
            await syncSwapEnd(wallet[i]);
        } else if (index3 == 2) {
            await syncSwapOTStart(wallet[i]);
        } else if (index3 == 3) {
            await syncSwapOTEnd(wallet[i]);
        } else if (index3 == 4) {
            await nexonFinanceStart(wallet[i]);
        } else if (index3 == 5) {
            await nexonFinanceETHStart(wallet[i]);
        } else if (index3 == 6) {
            await spaceFiStart(wallet[i]);
        } else if (index3 == 7) {
            await spaceFiEnd(wallet[i]);
        } else if (index4 == 0) { //OTHER STAGE
            await getBalanceWallet(wallet[i]);
        }

        await timeout(pauseWalletTime);
    }
    console.log(chalk.bgMagentaBright('Process End!'));
    logger.log('Process End!');
})();
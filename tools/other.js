import Web3 from 'web3';
import fs from 'fs';

export const info = {
    rpcTest: 'https://zksync2-testnet.zksync.dev',
    rpc: 'https://mainnet.era.zksync.io',
    rpcGoerli: 'https://rpc.ankr.com/eth_goerli',
    rpcMainet: 'https://rpc.ankr.com/eth',
    rpcArbitrum: 'https://arbitrum-one.public.blastapi.io',
    explorerTest: 'https://goerli.explorer.zksync.io/tx/',
    explorer: 'https://explorer.zksync.io/tx/',
    explorerMainet: 'https://etherscan.io/tx/',
    explorerArbitrum: 'https://arbiscan.io/tx/',
    bridgeGoerli: '0x1908e2BF4a88F91E4eF0DC72f02b8Ea36BEa2319',
    bridgeMainet: '0x32400084C286CF3E17e7B677ea9583e60a000324',
    ETH: '0x0000000000000000000000000000000000000000',
    ETHBridge: '0x000000000000000000000000000000000000800A',
    WETH: '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91',
    WETHTest: '0x20b28b1e4665fff290650586ad76e977eab90c5d',
    USDC: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4',
    USDCTest: '0x0faF6df7054946141266420b43783387A78d82A9',
    SPACE: '0x47260090cE5e83454d5f05A0AbbB2C953835f777',
    LPPoolSPACE: '0xfDC4Ce439e672E81c6B86E6Cd45ffB0A7CcF9d44',
    OT: '0xD0eA21ba66B67bE636De1EC4bd9696EB8C61e9AA',
    LPPool: '0x80115c708E12eDd42E504c1cD52Aea96C547c05c',
    LPPoolTest: '0xcFA3d5C02D827c0d1A48B4241700AEBF751458FA',
    OTLPPool: '0x68aa22458D09bA63d99DeCafEB0bf8Ae83A2335A',
    SSRouter: '0x2da10A1e27bF85cEdD8FFb1AbBe97e53391C0295',
    SSRouterTest: '0xB3b7fCbb8Db37bC6f572634299A58f51622A847e',
    SSClassicPoolFactory: '0xf2DAd89f2788a8CD54625C60b55cD3d2D0ACa7Cb',
    SSClassicPoolFactoryTest: '0xf2FD2bc2fBC12842aAb6FbB8b1159a6a83E72006',
    SSPoolMaster: '0xbB05918E9B4bA9Fe2c8384d223f0844867909Ffb',
    SSPoolMasterTest: '0x22E50b84ec0C362427B617dB3e33914E91Bf865a',
    Unitoller: '0x0171cA5b372eb510245F5FA214F5582911934b3D',
    nUSDC: '0x1181D7BE04D80A8aE096641Ee1A87f7D557c6aeb',
    nETH: '0x1BbD33384869b30A323e15868Ce46013C82B86FB',
    SpaceRouter: '0xbE7D1FD1f6748bbDefC4fbaCafBb11C6Fc506d1d',
    SpaceFactory: '0x0700Fb51560CfC8F896B2c812499D17c5B0bF6A7',
    SpaceLPPool: '0xD0cE094412898760C2A5e37AbeC39b0E785b45aE',
    SpaceFarmer: '0xaCF5a67f2fCFEDA3946ccb1ad9d16d2Eb65c3c96',
    NameService: '0x935442AF47F3dc1c11F006D551E13769F12eab13',
    LibertasNFT: '0xD07180c423F9B8CF84012aA28cC174F3c433EE29',
    IzumiRouter: '0x9606eC131EeC0F84c95D82c9a63959F2331cF2aC',
    IZI: '0x16A9494e257703797D747540f01683952547EE5b',
    approveAmount: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
}

export const orbiter = {
    routerETH: '0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8',
    minAmount: 0.005,
    Arbitrum: {
        chainId: 9002,
        holdFee: 0.0009,
    },
    zkSyncEra: {
        chainId: 9014,
        holdFee: 0.001,
    }
}

export const timeout = ms => new Promise(res => setTimeout(res, ms));

export const shuffle = (array) => {
    let currentIndex = array.length,  randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
}

export const generateRandomAmount = (min, max, num) => {
    const amount = Number(Math.random() * (parseFloat(max) - parseFloat(min)) + parseFloat(min));
    return Number(parseFloat(amount).toFixed(num));
}

export const parseFile = (file) => {
    const data = fs.readFileSync(file, "utf-8");
    const array = (data.replace(/[^a-zA-Z0-9\n]/g,'')).split('\n');
    return array;
}

export const privateToAddress = (privateKey) => {
    const w3 = new Web3();
    return w3.eth.accounts.privateKeyToAccount(privateKey).address;
}
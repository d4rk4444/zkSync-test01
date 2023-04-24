import Web3 from 'web3';
import { info, parseFile, generateRandomAmount } from './other.js';
import { nameServiceAbi } from './abi.js';

export const generateRandomName = async() => {
    const words = parseFile('./tools/words.txt');
    let word = words[generateRandomAmount(0, words.length - 1, 0)];

    const random = generateRandomAmount(0, 1, 0);
    let number = 0;
    if (random == 0) {
        for (let i = 0; i < generateRandomAmount(1, 5, 0); i++) {
            number = number + generateRandomAmount(0, 10, 0);
            word = word + number;
        }
    } else {
        for (let i = 0; i < generateRandomAmount(1, 5, 0); i++) {
            number = number + generateRandomAmount(0, 10, 0);
            word = number + word;
        }
    }

    return word;
}

export const dataRegisterName = async(rpc, name, sender) => {
    try {
        const w3 = new Web3(new Web3.providers.HttpProvider(rpc));
        const contract = new w3.eth.Contract(nameServiceAbi, info.NameService);

        const data = await contract.methods.Register(
            name
        );

        const encodeABI = data.encodeABI();
        const estimateGas = await data.estimateGas({ value: 3000000000000000, from: sender });
        return { encodeABI, estimateGas };
    } catch (err) {
        if (err.data.message == 'cannot estimate gas: This is already taken') {
            return false;
        }
    }
}
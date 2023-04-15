# zkSync-test   
A script for automating actions in the ZkSync Era network. Interacts with projects such as: ZkSync Portal, SyncSwap, Nexon Finance, SpaceFi.    

## Description
Description of all functions        

1. BRIDGE       
    1. Bridge Ethereum -> ZkSync in amount     
    2. Ethereum -> ZkSync bridge in percentage      
    3. Bridge ZkSync -> Ethereum in percentage  
    4. Мост ZkSync -> Arbitrum в процентах
    5. Withdrawal to OKX wallet from Ethereum     
    6. Withdrawal to OKX wallet from Arbitrum   
2. RANDOM       
    1. First part of randomization    
        - SyncSwap: Swap ETH -> USDC, Create LP     
        - SpaceFi: Swap ETH -> USDC, Create LP, Deposit LP for farming      
        - NexonFinance: Swap ETH -> USDC, Deposit USDC, Borrow USDC     
    2. Second part of randomization    
        - SyncSwap: Delete LP, Swap USDC -> ETH     
        - SpaceFi: Withdraw LP, Delete LP, Swap ETH -> USDC     
        - NexonFinance: Repay USDC, Withdraw USDC, Swap USDC -> ETH     
3. ALL FUNCTIONS      
    1. SyncSwap: Exchange ETH -> USDC, create LP    
    2. SyncSwap: Delete LP, exchange USDC -> ETH    
    3. SyncSwap: Exchange ETH -> OT, create LP    
    4. SyncSwap: Delete LP, exchange OT -> ETH    
    5. NexonFinance: Exchange ETH -> USDC, Deposit USDC, Borrow USDC, Repay USDC, Withdraw USDC, Exchange USDC -> ETH.    
    6. NexonFinance: ETH Deposit, ETH Withdrawal      
    7. SpaceFi: Exchange ETH -> USDC, create LP, replenish LP for farming     
    8. SpaceFi: Withdraw LP, Delete LP, Exchange USDC -> ETH    
    9. SpaceFi: Exchange ETH -> SPACE, create LP     
    10. SpaceFi: Delete LP, Exchange SPACE -> ETH    
4. OTHER    
    1. Ethereum/ZkSync balance check    
    
## Setup    
``` 
git clone https://github.com/d4rk4444/zkSync-test.git
cd zkSync-test
npm i
``` 

## Configuration    
All the settings you need are in the .env file      

1. Time for pause between actions          
2. Time to pause between wallets     
3. Gas price for the bridge Ethereum -> ZkSync   
4. Amount of ETH for the bridge Ethereum -> ZkSync in Percentage  
5. Amount of ETH for the bridge Ethereum -> ZkSync in Ether  
6. ETH amount for exchange in all actions  
7. Slippage for the loan in NexonFinance 
8. Slippage for exchange/liquidity in Percentages   
9. ETH amount for ZkSync -> Ethereum bridge in Percentages  

In the private.txt file insert private addresses in this format:     
```
key1
key2
```

In the file subWallet.txt insert addresses for output from Ethereum in this format:      
```
address1
address2
```
    
## Launch
```
node index
```
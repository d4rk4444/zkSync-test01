# zkSync-test
Скрипт для автоматизации действий в сети ZkSync Era. Взаимодействует с такими проектами как: ZkSync Portal, SyncSwap, Nexon Finance, SpaceFi.    

## Описание
Описание всех функций скрипта      

1. МОСТ     
    1. Мост Ethereum -> ZkSync в количестве     
    2. Мост Ethereum -> ZkSync в процентах      
    3. Мост ZkSync -> Ethereum в процентах      
    4. Мост ZkSync -> Arbitrum в процентах      
    5. Вывод на кошелек OKX c Ethereum    
    6. Вывод на кошелек OKX c Arbitrum     
2. РАНДОМ       
    1. Первая часть рандомизации    
        - SyncSwap: Swap ETH -> USDC, Create LP ETH/USDC    
        - SyncSwap: Swap ETH -> OT, Create LP ETH/OT   
        - SpaceFi: Swap ETH -> USDC, Create LP, Deposit LP for farming      
        - SpaceFi: Swap ETH -> SPACE, Create LP ETH/SPACE      
        - NexonFinance: Swap ETH -> USDC, Deposit USDC, Borrow USDC, Repay USDC, Withdraw USDC, Swap USDC -> ETH   
        - NexonFinance: Deposit ETH, Withdraw ETH       
    2. Вторая часть рандомизации    
        - SyncSwap: Delete LP, Swap USDC -> ETH     
        - SyncSwap: Delete LP, Swap OT -> ETH     
        - SpaceFi: Withdraw LP, Delete LP, Swap USDC -> ETH     
        - SpaceFi: Withdraw LP, Delete LP, Swap SPACE -> ETH     
        - NexonFinance: Swap ETH -> USDC, Deposit USDC, Borrow USDC, Repay USDC, Withdraw USDC, Swap USDC -> ETH     
3. ВСЕ ФУНКЦИИ      
    1. SyncSwap: Swap ETH -> USDC, Create LP    
    2. SyncSwap: Delete LP, Swap USDC -> ETH    
    3. SyncSwap: Swap ETH -> OT, Create LP    
    4. SyncSwap: Delete LP, Swap OT -> ETH    
    5. NexonFinance: Swap ETH -> USDC, Deposit USDC, Borrow USDC, Repay USDC, Withdraw USDC, Swap USDC -> ETH    
    6. NexonFinance: Deposit ETH, Withdraw ETH      
    7. SpaceFi: Swap ETH -> USDC, Create LP, Deposit LP for farming     
    8. SpaceFi: Withdraw LP, Delete LP, Swap USDC -> ETH    
    9. SpaceFi: Swap ETH -> SPACE, Create LP     
    10. SpaceFi: Delete LP, Swap SPACE -> ETH    
4. ОСТАЛЬНЫЕ
    1. Проверка баланса Ethereum/ZkSync
    
## Установка
```
git clone https://github.com/d4rk4444/zkSync-test.git
cd zkSync-test
npm i
```

## Настройка
Все нужные настройки в файле .env    
    
1. Время для паузы между действиями          
2. Время для паузы между кошельками     
3. Цена газа для моста Ethereum -> ZkSync   
4. Кол-во ETH для моста Ethereum -> ZkSync в Процентах  
5. Кол-во ETH для моста Ethereum -> ZkSync в Эфире  
6. Кол-во ETH для обмена во всех действиях  
7. Проскальзывание для займа в NexonFinance 
8. Проскальзывание для обмена/ликвидности в Процентах   
9. Кол-во ETH для моста ZkSync -> Ethereum в Процентах  

В файл private.txt вставляете приватные адреса в таком формате:     
```
ключ1
ключ2
```

В файл subWallet.txt вставляете адреса для вывода с Ethereum в таком формате:      
```
адрес1
адрес2
```
    
## Запуск
```
node index
```
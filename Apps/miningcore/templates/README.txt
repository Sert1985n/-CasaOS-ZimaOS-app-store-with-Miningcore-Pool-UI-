Шаблоны config.json и coins.json для Miningcore.
После установки PostgreSQL и Miningcore:
1. Скопируйте config.json и coins.json в /media/ZimaOS-HD/miningcore/
2. Замените "xxx" на ваш wallet-адрес в config.json (pools[].address и rewardRecipients[].address)
3. В persistence.postgres укажите хост контейнера PostgreSQL (например postgresql или IP)
4. RVN использует порт 6010 (без конфликта с SSH 22).
Дифы: 6xxx = 1TH, 62xx = 120TH, 63xx = 250TH, 64xx = NerdMiner.

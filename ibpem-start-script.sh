 #! /bin/sh

sudo apt-get -y install unzip

sudo apt-get -y install libatk-bridge2.0-0

sudo apt-get -y install libxss1

sudo apt-get -y install libgbm1

sudo apt-get -y install libgtk-3-0

sudo apt-get -y install libasound2

cd .. &&

FILE=dq-report
if [ ! -d "$FILE" ]; then
    echo "$FILE does not exist! Going to download ===> "
    wget --load-cookies /tmp/cookies.txt "https://docs.google.com/uc?export=download&confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id=10OKDPTOoC-tH6lVocOwetZaU_wAFHISU' -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')&id=10OKDPTOoC-tH6lVocOwetZaU_wAFHISU" -O dq-report.zip && rm -rf /tmp/cookies.txt
    unzip dq-report.zip
    chmod -R 777 dq-report/
    rm dq-report.zip
else 
    echo "$FILE exists. Success."
fi
echo "Checking finished."
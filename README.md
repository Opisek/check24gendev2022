# check24gendev2022
A concept website for comparing hotels. Created as an entry for CHECK24 GenDev 2022.

## Installation
This project runs in two docker containers that need to share a common directory together with the host OS, so as to load the initial data.
1. Choose a directory for the project
`mkdir /opt/gendev`
2. Create a `data` subdirectory within the project's directory
`mkdir /opt/gendev/data`
3. Copy the `offers.csv` and `hotels.csv` files into the data directory
`mv offers.csv hotels.csv /opt/gendev/data`
4. Make sure docker has read and write permissions to all the files within the project directory
`chmod -R 777 /opt/gendev`
5. Download the source code
`git clone https://github.com/Opisek/check24gendev2022`
6. Enter the source code
`cd check24gendev2022`
7. Build the docker container
`docker build . -t opisek/check24gendev2022`
8. Adjust the volumes and ports in the `docker-compose.yml` file as needed. The environment variables need not be changed in a testing environment except for `DATA_PATH`
9. Start the app
`docker-compose up`
10. The website is now accessible via the published port

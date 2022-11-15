# check24gendev2022
A concept website for comparing hotels. Created as an entry for CHECK24 GenDev 2022.

The teck stack of the project has been kept minimalistic. The finished entry is a website with pure HTML5 + CSS3 + JavaScript frontend, Node.js backend (with a few necessary libraries), and a PostgreSQL database. All code in the repository has been written entirely from scratch.

## Features
### Browsing
The browsing experience has been divided into two parts. Firstly, the user can browse through all the different hotels, and secondly, they can select one at a time via a "See Offers" button to browse the actual trips by the selected hotel.
### Filtering
Both the hotel and the subsequent offer search support extensive filters that can be applied live to change the shown results. The filters include:
- Search query (here it filters matching hotel names, this functionality could however be expanded to city names or more broad locations)
- Sorting order
- Saved by the user
- Count of adults
- Cound of children
- Price range (min and max)
- Hotel stars range (min and max)
- Date (earliest departure and latest return)
- Room type
- Meal type
- Oceanview
### Accounts and Saving
The application includes a user registration system.
- Users can register and log in.
- Session authentication data is stored in JWT cookies.
- Users can save hotels and offers that they like
  - The saved entries can be viewed later throught ticking the "Saved" filter checkbox
  - The hotel and offer saves have a certain kind of dependency enforced by the server: A saved offer can only be within a saved hotel. This means the following:
    - If the user saves an offer inside of an unsaved hotel, the hotel will also be saved.
    - If the user unsaves a hotel that happens to have saved offers inside, these offers will be unsaved.
### Responsiveness
The whole website has been built from the ground up with desktop and mobile support in mind.
- The CSS grid and flexbox display types have been used extensively to guarentee a responsive experience on any kind of device
- The navigation bar changes into a button on mobile devices that brings up a full-page navigation menu
- The filters sidebar is hidden on mobile devices and can be revealed to fill the entire page with the press of a button
- The colour scheme can be switched between a light mode and dark mode with the preferred setting saved in a cookie
### Modular design
Both the frontend and backend utilize highly modular designs that allow for all kinds of flexibility.
- The colours and dimensions of all css elements are defined in separate files that can be selected dynamically. This allows for example for a universal light and dark mode across all subpages
- The backend has been inspired by the MVVM design pattern, such that individual components of the application (web server, database connection, user authentication) are not connected together directly, but via upper management-code through events and listeners
### Performance
A considerable amount of time has been spent on optimizing the performance for a reasonably smooth browsing experience.
- The offers table has been partitioned by the amount of adults and the amount of children to reduce the amount of entries in a single table.
- The offers table has been indexed by several columnts to optimize search queries.
- The results for hotels and offers are pulled 100 at a time (10 pages). Upon reaching a previously unvisited page, the correlating chunk of 100 entries is pulled again. All the previous data, provided no filters have changed, still remain in the client's cache, so that the pages can be viewed quickly and without the involvement of the server.

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

## Limitations and Expandability
This chapter dives into concurrent issues that could not be solved by the application deadline as well as planned, but not implemented features.
- The home page misses functionality
  - The "Popular Destinations" section would display hotels and/or locations frequently searched by users
  - The "My List" section would include a short summary of one's list of saved hotels and/or offers with a button that redirects to the appropriata subpage, e.g. `/search?saved=true` or `/hotel/{id}?saved=true`
  - The "Did you know?" section would display interesting facts and trivia about available destinations, together with a correspanding redirect button
- The formatting of certain pages could be improved
  - When browsing offers by hotels on mobile, the name of the hotel is prone to being cropped
  - The registration page is prone to being cropped on mobile
  - The dropdown menus have a horizantol overflow instead of being wrapped
- The provided hotel coordinates could be use for a map view
- The expiry date of cookies is not being set properly
- Saving hotels and offers could be implemented for users with no accounts
  - The identification number of a "visitor" (a user with no account) would be saved in a JWT cookie
  - Futher information like IP address, browser type, etc. could be saved for the case that the cookie is deleted
  - Upon creating an account or logging in, the hotels and offers saved prior to authentication would be merged into the user's list
- Account-related e-mails
  - Confirmation e-mails could be sent upon registration
  - "Forgot Password" functionality has not been implemented due to the lack of e-mail support and thus the impossibility to implement recovery e-mails
- Multilingual support
  - Support for multiple languages has been a key consideration from the birth of the project
  - Certain aspects of the UI already support on-demand translations, like for example room and meal types or login and registration errors. This could be easily expanded to the entirity of the website
  - The translations (that is to say, dictionary lookups by hard-coded keys) are currently provided in their fullness by the server during runtime. This decision was made so that the implementation of this feature would be quick. In a real life scenario, however, this workload shoud be relayed onto the client via, for example, passing the translation JSON files directly.
- Performance
  - Better indexes for the offers table could be looked into, so that certain search queries can be furher optimized
  - More efficient partitioning of the offers table and filter enforcement could be looked into. The current partitioning by adults and children count, unfortunately, still leaves ~40 million entries in a single table in worst case scenario, however those two properties have been chosen to be the only enforced filters for this submission.
  - Smarter caching techniques could be implemented
  - Common queries could be precalculated

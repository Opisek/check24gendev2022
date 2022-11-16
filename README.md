# check24gendev2022
A concept website for comparing hotels and vacation offers. Created as an entry for [CHECK24 GenDev 2022](https://github.com/check24-scholarships/holiday-challenge).

The tech stack of the project has been kept minimalistic. The finished entry is a website with pure HTML5 + CSS3 + JavaScript frontend, Node.js backend (with a few necessary libraries), and a PostgreSQL database. All code in the repository has been written entirely from scratch.

## Contents
- [Features](#features)
  - [Browsing](#browsing)
  - [Filtering](#filtering)
  - [Accounts and Saving](#accounts-and-saving)
  - [Responsiveness](#responsiveness)
  - [Modular Design](#modular-design)
  - [Performance](#performance)
 - [Installation](#installation)
 - [Limitations and Expandability](#limitations-and-expandability)
 - [Credits](#credits)
 - [Pictures](#pictures)

## Features
### Browsing
The browsing experience has been divided into two parts. Firstly, the user can browse through all the different hotels, and secondly, they can select one at a time via a "See Offers" button to browse the actual trips by the selected hotel.
### Filtering
Both the hotel and the subsequent offer search support extensive filters that can be applied live to change the shown results. The filters include:
- Search query (here it filters matching hotel names, this functionality could however be expanded to city names or more broad locations)
- Sorting order
- Saved by the user
- Count of adults
- Count of children
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
This project runs in two docker containers that need to share a common directory together with the host OS, so as to load the initial data. Please note that the CHECK24 data sets are not included in this repository and have to be added manually accourding to the following guide.
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
10. The first start-up may take a few minutes. General progress and errors can be found in docker logs.
11. The website is now accessible via the published port.

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

## Credits
This section accredits third-party content creators or mainainers for their work used in this project.
### Icons
- Close Icon: ariefstudio - Flaticon
- Menu Icon: ariefstudio - Flaticon
- Arrow Icons: Roundicons - Flaticon
- Moon Icon: Good Ware - Flaticon
### Airports and airlines data
- https://openflights.org/data.html

## Pictures
### Home Page
![home-desktop-light](https://user-images.githubusercontent.com/40141286/202013193-0855520e-8a11-40bc-91e5-27db7e7370dc.png)
![home-desktop-dark](https://user-images.githubusercontent.com/40141286/202013188-cef78709-1418-483b-b5f0-6d9a435ed1d5.png)
![home-phone-light](https://user-images.githubusercontent.com/40141286/202013206-f3416228-2d9b-4c93-9a80-48047f412472.png)
![home-phone-dark](https://user-images.githubusercontent.com/40141286/202013203-f5b09e6c-e6f8-4e46-8c51-71df5a3d2c04.png)

### Hotel Search
![search-desktop-light](https://user-images.githubusercontent.com/40141286/202013271-cbeb7410-d425-41de-8dd9-7525a665e29a.png)
![search-desktop-dark](https://user-images.githubusercontent.com/40141286/202013264-3c054cf1-e2a8-4009-8c51-6f5fd855005b.png)
![search-phone-light](https://user-images.githubusercontent.com/40141286/202013275-d242890f-14bf-4d21-ac9f-ff36ce4d8fc3.png)
![search-phone-dark](https://user-images.githubusercontent.com/40141286/202013262-272338ce-a54e-4882-8d04-0cf30e5b80c7.png)

### Offer Search
![hotel-desktop-light](https://user-images.githubusercontent.com/40141286/202013215-91dec0bd-3d38-48cc-b236-621da9fad046.png)
![hotel-desktop-dark](https://user-images.githubusercontent.com/40141286/202013208-497da5ca-ecc8-47c9-9549-a0c20a832f78.png)
![hotel-phone-light](https://user-images.githubusercontent.com/40141286/202013223-e4935587-ed3a-4c29-8f98-4726799372c3.png)
![hotel-phone-dark](https://user-images.githubusercontent.com/40141286/202013222-49aba3d6-178e-4746-8cc8-d22be3b882a7.png)

### Login
![login-desktop-light](https://user-images.githubusercontent.com/40141286/202013234-fcfdacce-9caa-4f1f-95e9-21cece90efa9.png)
![login-desktop-dark](https://user-images.githubusercontent.com/40141286/202013231-99d0b1f4-a341-4576-aa55-b86d7e93e45c.png)
![login-phone-light](https://user-images.githubusercontent.com/40141286/202013244-1ac4da6b-397b-4cfe-824b-8ebd241d160d.png)
![login-phone-dark](https://user-images.githubusercontent.com/40141286/202013241-e2379d38-33f8-4305-9eed-746b65df2ceb.png)

### Mobile filters
![filters-mobile-light](https://user-images.githubusercontent.com/40141286/202013183-d4772e78-bcb4-467a-95d3-9e13b8036fbd.png)
![filters-mobile-dark](https://user-images.githubusercontent.com/40141286/202013179-2874b5c4-498e-4455-86cd-76b353787d89.png)

### Mobile Navigation
Note: The background should be blurred, but my browser removed that from the screenshot.

![navigation-mobile-dark](https://user-images.githubusercontent.com/40141286/202013250-ed5320f4-f327-4075-b4a4-e61b37397d36.png)
![navigation-mobile-light](https://user-images.githubusercontent.com/40141286/202013260-26324875-1c45-4ce5-87c0-e1796e9236bd.png)


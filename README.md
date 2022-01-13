To run this app, there should be Node.js installed on your device.  
The app itself needs the request-library for the http calls, please install with 'npm install request'.  
After these steps, the app can be ran with 'node app.js'.  
  
The app currently takes userinput, sends a request to coingecko with got input and finally prints out 3 things related to bitcoins' price in  the given date range:  
First, how many consecutive days did bitcoins' price decrease?  
Second, what was the largest daily volume?  
And third, if you could go back in time, what is the best day to buy bitcoin and sell the bought bitcoin for the greatest profit?

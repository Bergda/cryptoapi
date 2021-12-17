//require needed modules
const request = require('request');
const readline = require("readline").createInterface({
    "input": process.stdin,
    "output": process.stdout
  });


//function for reading userinput from terminal
async function inputFromDate(defaultOption = true) {

    return new Promise(function(resolve) {

        readline.question("Please input 'from' date in MM/DD/YYYY: ", async function(answer) {  //ask the user for from-date in correct format

            if (isDate(answer)) {  //use isDate() to check if given 'answer' is in MM/DD/YYYY, if yes -> resolve with given answer, otherwise run the function again
                resolve(answer);
            } else {
                resolve(await inputFromDate(defaultOption));
            }
        });
    });
}

//function for reading userinput from terminal
async function inputToDate(fromDate, checkpoint, defaultOption = true) {  //use a few more parameters

    return new Promise(function(resolve) {

        readline.question("Please input 'to' date in MM/DD/YYYY: ", async function(answer) {  //ask the user for fromdate in correct format

            if (isDate(answer)) {  //ask the user for to-date in correct format
                let toDate = Math.round(new Date(answer).getTime()/1000 + 7200);  //convert given answer to the same format than parameter "fromDate", add 7200 (2 hours) to get closer to 00:00

                if (fromDate <= toDate){  //compare if fromDate is larger than toDate (dates now in unix timestamps hence actually checking fromDate < toDate rather than fromDate > toDate)
                    resolve(toDate);
                } else {  //if the toDate is not the same or in the future comparing to fromDate, let the user know and run the code again
                    console.log("Please input a date that is greater or same than the 'from' date: " + checkpoint)  //checkpoint = fromDate in MM/DD/YYYY format
                    resolve(await inputToDate(fromDate, defaultOption));
                }
            } else {  // if isDate=false -> run the function again
                resolve(await inputToDate(fromDate, defaultOption));
            }
        });
    });
}


//function for checking if the userinput (answer) is in the format that we want it in
function isDate(answer){  //give the userinput as a parameter
    let date = answer.split("");  //splits the userinput to single characters
    let calendar = answer.split("/");  //splits the userinput from slashes
    
    if (date.length === 10){  //check if there are 10 characters in the userinput (MM/DD/YYYY = 10 characters)
        if (date[2,5] === "/"){  //check if slashes are in correct places
            if (isNaN(date[0,1,3,4,6,7,8,9])){  //check if characters on MM + DD + YYYY are numbers
                console.log("Incorrect format")
                return false;
            } else if (calendar[2] < 2013 && calendar[0] < 04 && calendar[1] < 28){  //first day for data in coingeckos bitcoin charts is from 28th of April in 2013, checks if userinput is before that date
                console.log("No data, please start from atleast 04/28/2013")
                return false;
            } else {
                return true;
            }
        } else {
            console.log("Incorrect format")
            return false;
        } 
    } else {
        console.log("Incorrect format")
        return false;
    }
}



//function that awaits the userinput functions
async function getDate() {
    let fromDate = await inputFromDate();  //assigns the date given in inputFromDate() to a variable
    let checkpoint = fromDate;  //create another variable to hold the original date to use in inputToDate() (used to give the user a date rather than an timestamp)

    fromDate = Math.round(new Date(fromDate).getTime()/1000 + 7200);  //convert fromDate to unix timestamp (used in the api), add 7200 (2 hours) to get closer to 00:00
    
    let toDate = await inputToDate(fromDate, checkpoint);  //assigns the date given in inputToDate() to a variable, pass parameters to help compare that to-date is not in the past
    
    //as the to-date is already coverted to unix timestamp inside the inputToDate() function, no need to convert it again

    let data = [fromDate, toDate];  //create an array to return both dates

    return data;  //return the dates
}




//function that does most of the work and the one that will be called in the end
async function dataParse(){
    let data = await getDate();  //log the dates to a variable
    let fromDate = data[0];  //as the dates are in an array, log them to new variables
    let toDate = data[1];
    let priceArray = [];  //creating empty arrays to use in the future
    let volumeArray = [];
    let days = parseFloat((toDate - fromDate) / 86400).toFixed(0);  //create a variable that holds the number of days from fromDate to toDate
    let granularity = false;  //create a variable to help in the future
    let beforeGranularityDate = 0;  //create a variable that will help in the future


    //workaround for coingeckos automatic data granularity (if the difference in dates is smaller than 90 days, returns too much data for us as we want only one datapoint per day)
    if (toDate - fromDate <= 7776000){  //check if the difference inbetween the dates is smaller or equal than 90 days (in unix timestamp)
        beforeGranularityDate = toDate;  //log the un-altered toDate
        toDate = fromDate + 7862400;  //convert toDate to fromDate + 91 days (90 + the toDate,dx hence 91) 7862400
        granularity = true;  //change the variable to true to use in the future
    }

    let url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=' + fromDate + '&to=' + toDate;  //define url for api get-request

    //define the request parameters
    const options = {
        url: url,
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8',
            'Cache-Control': 'max-age=30,public,must-revalidate,s-maxage=300'
        }
    };
    
    request(options, function(err, res, body) {  //request block, most of the code is ran from this block
        if (err){  //checks for error
            console.log("\n" + err + "\nMost likely not connected to internet")  //with the way the code is written, the most possible error happens when the app can't find api.coingecko.com which most likely is because there is no internet connection
            process.exit();  //stops the code from running
        }
        let json = JSON.parse(body);  //store the received body in a json



        for (i = 0; i <= days; i++){  //loop as many times as there are days (as defined earlier)

            //while testing, found that sometimes random values in the json were undefined which caused the code to crash, these if-statements prevent that with minimal effect for the user experience
            if (json.prices[i] != undefined){
                let priceData = JSON.stringify(json.prices[i]).split(",");  //splits json property at ','
                let price = Math.round(parseFloat(priceData[1]));  //formats price and makes it into an integer to enable correct comparisons in the future (loses decimals but for the sake of correct comparisons decided that it was better this way)
                priceArray.push(price);  //pushes each price that we go though in the loop into priceArray
            }
            
            if (json.total_volumes[i] != undefined){  //same thing but for volumes
                let volumeData = JSON.stringify(json.total_volumes[i]).split(",");
                let volume = Math.round(parseFloat(volumeData[1]));
                volumeArray.push(volume);
            }
        }

        
        //format unix timestamps into dates to let user know which dates were given
        let startDate = fromDate;
        startDate = new Date(fromDate * 1000);
        startDate = (startDate.getMonth()+1 + "/" + startDate.getDate() + "/" + startDate.getFullYear())
    
        
        //here we use our granularity variables, check if granularity workaround was used
        if (granularity){
            toDate = beforeGranularityDate;  //change toDate to the before logged "real" toDate
        }
    
        //same timestamp -> date formatting
        let endDate = toDate;
        endDate = new Date(toDate* 1000);
        endDate = (endDate.getMonth()+1 + "/" + endDate.getDate() + "/" + endDate.getFullYear())
    

        //console.log the formatted dates, letting the user know the date range
        console.log("\n\n\n")
        console.log("Given date range: " + startDate + "-" + endDate + "(MM/DD/YYYY)")
    


        //define variables used in getting the bearish trend
        let price = priceArray[0];  //define price as the first item in priceArray (price from the first day)
        let bearishDays = 0;  //create a variable to hold number of bearish days
        let bearishDaysArray = [];  //create array to log bearish days
        
        
        for (i = 1; i <= priceArray.length; i++){  //loop as many times as there are items in the array
            if (priceArray.length === 1){  //checks if theres only one item (price) in array -> there cant be a bearish trend
                console.log("There is data for only 1 day, can't detect a bearish trend")
            } else if (priceArray[i] < price && priceArray[i] < priceArray[i-1]){  //check if price in current loop is smaller than the price-variable && if price in current loop is smaller than in previous day/loop
                price = priceArray[i];  //define price as the current loops price
                bearishDays++;  //add 1 to the bearishDays as the price has now been going down for 1 more day
            } else {  //=if current loop price is larger than before, push bearishDays into the array and reset bearishDays as 0
                price = priceArray[i];
                bearishDaysArray.push(bearishDays);
                bearishDays = 0;
            }
        }
        
    
        bearishDays = 0;  //define bearishDays as 0 to prevent next loop from failing
    
        for (i = 0; i < bearishDaysArray.length; i++){  //loop through every item in bearishDaysArray
            if (bearishDaysArray[i] > bearishDays){  //check if current item is larger than the number that bearishDays holds (in 1st loop, 0 -> true for next item that is larger than 0)
                bearishDays = bearishDaysArray[i];  //define bearishDays as the current item in the array = bearishDays always holds the current largest item in array
            }
        }
    
        if (bearishDays > 0){  //check if logged largest bearishDays is larger than 0 (almost always)
            console.log("Longest bearish trend in the given date range was " + bearishDays + " day(s)")  //let the user know
        } else {  //otherwise if bearishDays = 0 (when price has not been decreasing in given date range)
            console.log("Bitcoins price did not decrease in given date range")
        }


        //define variables used in getting highest volume
        let volumeDate = 0;  //variable to hold the date when there was the highest volume
        let highestVolume = 0;  //variable to hold the highest volume to help in comparison
    

        for (i = 0; i < volumeArray.length; i++){  //loop as many times as there are items in the array

            if (volumeArray.length === 1){  //check if theres only 1 item in the array 
                highestVolume = volumeArray[0];  //defining highestVolume as the only item since it must be the highest
            } else if (volumeArray[i] > highestVolume){  //check if current item is larger than item held in highestVolume
                highestVolume = volumeArray[i];  //define the current item as the item held in hihghestVolume
                volumeDate = i;  //define volumeDate as the current iterable
            }
        }
        
        //format the volumeDate and print it out together with the highest volume
        volumeDate = volumeDate * 86400;
        volumeDate = new Date((fromDate + volumeDate) * 1000);
        volumeDate = (volumeDate.getMonth()+1 + "/" + volumeDate.getDate() + "/" + volumeDate.getFullYear())
        console.log("Highest volume in the given date range was " + highestVolume + "€ on " + volumeDate)


        //define variables used in getting the profit
        let buyDate = 0;
        let sellDate = 0;
        let profit = 0;
    
    
        for (i = 0; i < priceArray.length; i++){  //loop as many times as there are items in the array
            for (x = i + 1; x < priceArray.length; x++){  //loop through the next items (for example 0->1234 1->234 2->34)
                if (priceArray[i] < priceArray[x]){  //check if item got from first loop iterable is smaller than the item got from second loop iterable
                    if (priceArray[x] - priceArray[i] > profit){  //check if the difference betweeen the items is larger than the 'difference' held in profit-variable
                        profit = priceArray[x] - priceArray[i]  //store the new 'larger' difference
                        buyDate = i;  //store the buy and sell dates
                        sellDate = x;
                    }
                }
            }
        }
    
    
        //format the buy and sell dates
        buyDate = fromDate + (buyDate * 86400);  //fromDate + (buyDate * 1day in unix timestamp)
        buyDate = new Date(buyDate * 1000);  //*1000 to turn unix timestamp into javascript timestamp
        buyDate = (buyDate.getMonth()+1 + "/" + buyDate.getDate() + "/" + buyDate.getFullYear())
    
        sellDate = fromDate + (sellDate * 86400);
        sellDate = new Date(sellDate * 1000);
        sellDate = (sellDate.getMonth()+1 + "/" + sellDate.getDate() + "/" + sellDate.getFullYear())
    
    
        //printing correct response
        if (priceArray.length === 1){  //if there was only 1 price -> no profit to be made 
            console.log("Only one day in the given date range, can't calculate way to maximize profit")
        } else if (bearishDaysArray.length === 1 && bearishDaysArray[0] > 0){  //if there's only 1 logged item in bearishDaysArrays && if the only item is larger than 0 -> price has only been decreasing
            console.log("In the given date range bitcoin's price only decreased, do not buy (or sell)!")
        } else {  //otherwise there is enough data to determine the buy and sell dates
            console.log("Best way to maximize profits from bitcoin in the given date range is buying on " + buyDate + " and selling on " + sellDate)
        }        
        
    process.exit();  //stops the code from running
    });

}


//call the function to execute the app
dataParse();
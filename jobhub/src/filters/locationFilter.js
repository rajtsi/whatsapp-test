const allowedLocations = [
    "india", "bangalore", "bengaluru", "hyderabad", "pune", "noida", 
    "gurgaon", "mumbai", "chennai", "delhi", "ahmedabad", "kolkata", "remote india"
];

const rejectedLocations = [
    "germany remote", "usa remote", "europe remote", "canada remote", "netherlands"
];

function isAllowedLocation(location = "") {
    const locLower = location.toLowerCase();
    
    if (rejectedLocations.some(r => locLower.includes(r))) {
        return false;
    }

    return allowedLocations.some(a => locLower.includes(a));
}

module.exports = { isAllowedLocation };

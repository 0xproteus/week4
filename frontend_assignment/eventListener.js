const ethers = require('ethers')
const greeterABI = require('./artifacts/contracts/Greeters.sol/Greeters.json').abi

const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/")
const contract = new ethers.Contract("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", greeterABI, provider)


contract.on("NewGreeting", (a) => {


    console.log(a)
    console.log(ethers.utils.parseBytes32String(a))

})
setInterval(() => { }, 1 << 30);
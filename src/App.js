import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import web3 from './web3';
import lottery from './lottery';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from 'react-toastify';
import { useState } from 'react';
class App extends Component {
   state = {
    manager: '',
    carPlayers: [],
    phonePlayers: [],
    computerPlayers: [],
    balance: '',
    value: '',
    message: '',
    currentAccount: '',
    lottery: null,  
    newOwnerAddress: '',
    winners: [],
    numberOfPrizesWon: 0,
  };

  async componentDidMount() {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Metamask is not installed');
    }
       // Έλεγχος αν το MetaMask είναι συνδεδεμένο στη σωστή blockchain (π.χ. Mainnet)
       const networkId = await window.ethereum.request({ method: 'net_version' });
       if (networkId !== '1') { // Αν το networkId δεν είναι '1', τότε δεν είναι στο Mainnet
           throw new Error('Please connect MetaMask to the Ethereum Mainnet');
       }
      const manager = await lottery.methods.manager().call();
      const carPlayers = await lottery.methods.getPlayers('car').call();
      const phonePlayers = await lottery.methods.getPlayers('phone').call();
      const computerPlayers = await lottery.methods.getPlayers('computer').call();
      const winners = await lottery.methods.getWinners().call();

       const balance = await web3.eth.getBalance(lottery.options.address);
      this.setState({ message: '', manager, carPlayers, phonePlayers, computerPlayers, balance,lottery,winners });

      if (!this.eventListenersSet) {
        this.setupEventListeners();
        this.eventListenersSet = true;
      }

      try {
        
        const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
        this.setState({ message: '', currentAccount });
      } catch (error) {
        this.setState({ message: 'Metamask has not connected yet' });
      }
    } catch (error) {
      this.setState({ message: 'Metamask is not installed' });
    }
    


    
    this.refreshTimer = setInterval(() => this.fetchContractData(), 500);
  }

  

  
  componentWillUnmount() {
    // Clear the refresh timer when the component is unmounted
    clearInterval(this.refreshTimer);
  }

  fetchContractData = async () => {
    try {
      const manager = await lottery.methods.manager().call();
      const carPlayers = await lottery.methods.getPlayers('car').call();
      const phonePlayers = await lottery.methods.getPlayers('phone').call();
      const computerPlayers = await lottery.methods.getPlayers('computer').call();
      const winners = await lottery.methods.getWinners().call();
       const balance = await web3.eth.getBalance(lottery.options.address);
      this.setState({ manager, carPlayers, phonePlayers, computerPlayers, balance });

      // Fetch current account information
      try {
        const currentAccount = (await window.ethereum.request({ method: 'eth_requestAccounts' }))[0];
        this.setState({ currentAccount });
      } catch (error) {
        this.setState({ message: 'Metamask has not connected yet' });
      }
    } catch (error) {
      this.setState({ message: 'Metamask is not installed' });
    }
  };



 
  setupEventListeners = () => {
    // Set up event listeners for Lottery contract events
    // Example:
    lottery.events.PlayerEntered({ fromBlock: 'latest' }, (error, event) => {
      if (!error) {
        const playerName = event.returnValues.player;
        const prize = event.returnValues.prize;      
          console.log('Player entered:', event.returnValues.player, 'for', event.returnValues.prize);
       toast.info(`Player ${playerName} entered for ${prize}`, { position: 'bottom-left' });

      } else {
        console.error('Error in PlayerEntered event:', error);
      }
    });

    lottery.events.WinnerPicked({ fromBlock: 'latest' }, (error, event) => {
      if (!error) {
        // Handle the event, update state or UI
        console.log('Winner picked:', event.returnValues.winner, 'for', event.returnValues.prize);
      } else {
        console.error('Error in WinnerPicked event:', error);
      }
    });
  };

  bid = async (prize) => {
    try {

       if (this.state.currentAccount == this.state.manager) {
        toast.warning("The owner cannot bid for the lottery.");
          
      } else {
        await lottery.methods.bid(prize).send({
          from: this.state.currentAccount,
          value: web3.utils.toWei('0.01', 'ether'), // Adjust the value as needed
        });      }
       
    } catch (error) {
      console.error('Error during bidding:', error);
    }
  };
  
  async declareWinners() {
    try {

 
         await lottery.methods.declareWinners().send({
          from: this.state.currentAccount,
          gas: 2000000,
        });
        toast.success('Winners Declared!');
  
      
      
        
  
      // Fetch updated contract data after the withdrawal
      const balance = await web3.eth.getBalance(lottery.options.address);
      this.setState({ balance });
      console.log("Success");
    } catch (error) {
      console.error('Only the owner can declare winners:', error);
      toast.error('Only the owner can declare winners:', { position: 'bottom-left' });

    }
  }
  
  


    
  transferOwnership = async () => {
    const { newOwnerAddress } = this.state;

    try {
      await lottery.methods.transferOwnership(newOwnerAddress).send({
        from: this.state.manager,
      });
      toast.success('Ownership transferred successfully!', { position: 'bottom-left' });
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast.error('Only the owner can transfer ownership', { position: 'bottom-left' });
    }
  };
  destroyContract = async () => {
    try {
      await lottery.methods.destroyContract().send({
        from: this.state.manager,
      });
      toast.success('Contract destroyed successfully!', { position: 'bottom-left' });
    } catch (error) {
      console.error('Error destroying contract:', error);
      toast.error('Only the owner can destroy the contract', { position: 'bottom-left' });
    }
  };

  withdraw = async () => {
    try {
      await lottery.methods.withdraw().send({
        from: this.state.currentAccount,
      });

      // Fetch updated contract data after the withdrawal
      const balance = await web3.eth.getBalance(lottery.options.address);
      this.setState({ balance });
      console.log("sucess");
    } catch (error) {
      console.error('Only the owner can withdraw:', error);
      toast.error('Only the owner can withdraw', { position: 'bottom-left' });

    }
  };

  async amIWinner() {
    try {
      // Call the amIWinner function
      const numberOfPrizesWon = await lottery.methods.amIWinner().call({
        from: this.state.currentAccount,
      });

      console.log('Number of prizes won:', numberOfPrizesWon);

      // Set the numberOfPrizesWon in the component state
      this.setState({ numberOfPrizesWon });

      // Additional actions based on the result (if needed)
      if (numberOfPrizesWon > 0) {
        console.log('Congratulations! You won a prize.');
      } else {
        console.log('Sorry, you did not win any prize.');
      }
    } catch (error) {
      console.error('Error during amIWinner:', error);
    }
  }
  



  startNewCycle = async () => {
    try {
      await lottery.methods.startNewCycle().send({
        from: this.state.manager,
      });
      toast.success('New cycle started successfully!', { position: 'bottom-left' });
    } catch (error) {
      console.error('Error starting new cycle:', error);
      toast.error('Error starting new cycle', { position: 'bottom-left' });
    }
  };

  async declareWinnersAndHandleEvents() {
    try {
      // Call the declareWinners function
      const transaction = await lottery.methods.declareWinners().send({ from: this.state.currentAccount ,gas:2000000});  
 
      // Log transaction hash
      console.log('Transaction Hash:', transaction.transactionHash);
  
      // Wait for confirmation
      const receipt = await web3.eth.getTransactionReceipt(transaction.transactionHash);
  
      // Get the winners from the contract state
      const winners = receipt.logs
        .filter((log) => log.topics[0] === web3.utils.sha3('WinnerPicked(address,string)'))
        .map((log) => web3.eth.abi.decodeParameters(['address', 'string'], log.data));
  
      // Update local state with winners
      this.setState({ winners: winners.map((winner) => winner[0]) });
  
      // Additional actions after confirmation (if needed)
      // ...
    } catch (error) {
      console.error('Error:', error);
    }
  }


  render() {
    return (
      <>
        <h2 className='header'>Lottery - Ballot</h2>
        <div className="container">
          <div className="box">
            <h3 className='titleStyle'>Car</h3>
            <img className='imageStyle' src="https://raw.githubusercontent.com/antonisb1/Blockchain/master/public/car_photo.jpg" alt={`Image for Car`} />
            <button className='buttonStyle' onClick={() => this.bid('car')}>
              Bid
            </button>
            <p className="participantsCount">{this.state.carPlayers.length}</p>
          </div>
          <div className="box">
            <h3 className='titleStyle'>Phone</h3>
            <img className='phoneStyle' src="https://raw.githubusercontent.com/antonisb1/Blockchain/master/public/phone_photo.jpg" alt={`Image for Phone`} />
            <button className='buttonStyle' onClick={() => this.bid('phone')}>
              Bid
            </button>
            <p className="participantsCount">{this.state.phonePlayers.length}</p>
          </div>
          <div className="box">
            <h3 className='titleStyle'>Computer</h3>
            <img className='imageStyle' src="https://raw.githubusercontent.com/antonisb1/Blockchain/master/public/pc_photo.jpg" alt={`Image for Computer`} />
            <button className='buttonStyle' onClick={() => this.bid('computer')}>
              Bid
            </button>
            <p className="participantsCount">{this.state.computerPlayers.length}</p>
          </div>
        </div>
        <div className='accountContainer'>
      <h4>Current account :</h4>
      <h4>Owner's account :</h4>
      </div>
      <div className='textboxContainer'>
         <input className='textbox' readOnly type="text" class="textbox"placeholder={this.state.currentAccount}></input>
         <input className='textbox' readOnly   type="text" class="textbox"placeholder={this.state.manager}></input>

     </div>
     <div className='containerMain'>
     <ToastContainer />
     </div>
     <div className='allButtons'>
  <div className='buttonsContainer'>
    <button>Reveal</button>
    <button onClick={() => this.amIWinner()}>Am I Winner</button>
    <h2>Number of Prizes Won: {this.state.numberOfPrizesWon}</h2>
  </div>

  <div className='buttonsContainerOwner'>
    <div>
      <button onClick={() => this.withdraw()}>Withdraw</button>
      <button onClick={() => this.declareWinners()}>Declare Winner</button>
    </div>

    <div>
      <button onClick={() => this.startNewCycle()}>Start New Cycle</button>
      <button onClick={() => this.destroyContract()}>Destroy Contract</button>
    </div>

    <div>
      <button onClick={() => this.transferOwnership()}>Transfer Ownership</button>
      <input
        className='textbox'
        type="text"
        placeholder="New Owner's Address"
        value={this.state.newOwnerAddress}
        onChange={(e) => this.setState({ newOwnerAddress: e.target.value })}
      />
    </div>
  </div>
</div>

    

      </>
      
    );
  }
}

export default App;

const store = require('./store.js');
const { reducer } = require('./reducer.js');

const SERVER_UPDATE_RATE = 5000;

let io;
let broadcastInterval;


const broadcastGameState = (io) => {
  console.log('broadcasting')
  broadcastInterval = setInterval(() => {
    let state = store.getState();
    if (state.players.length) {
      io.emit('serverUpdate', state);
    }
  }, SERVER_UPDATE_RATE);

}


module.exports = { broadcastGameState };

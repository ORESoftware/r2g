// const {x} = require('../dist');
//
// console.log('this is the end.');
//
// x().then(function () {
//   console.log('no error yet.');
//   process.exit(0);
// })
// .catch(function (err) {
//   console.error('this was caught.', err);
//   process.exit(0);
// });
//


Object.prototype.getCleanStack = function(){
   return 'foo';
};


console.log(typeof Object('age').getCleanStack());


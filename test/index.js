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


process.on('unhandledRejection', function(r,p){
  console.error('unhandled rejection:', r);
});

Promise.all([true].map(async function (l) {
   throw new Error('balls to you daddy')
}))
.then(function(){
   console.log('got then');
})
.catch(function(err){
  console.error('got caught:', err);
});

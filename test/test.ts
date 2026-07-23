


// export class Foo {
//   aField = 'abc';
//   aMethod = () => 42;
// }
//
// const acceptsFooArg = (f: Foo) => {
//   return f.aMethod();
// };
//
// acceptsFooArg(new Foo());
// acceptsFooArg({aField: 'abcd', aMethod: () => 2});
//
//
// const v = acceptsFooArg(new Foo());


const v = {zoom:'bar'};
console.log({...v, zoom:3});

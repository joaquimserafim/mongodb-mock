# mongodb-mock

mock your mongodb

#### the problem
>sometimes is tough to test complicated/advanced queries you're using in your app with a module that tries to implement all the operations implemented in mongodb and your infrastructure team don't wants to install or configure the CI/CD pipeline to have mongodb running with your tests

#### OS supported
* linux
* darwin


## Usage

```js
var mongoMock = require('mongodb-mock')

var mock = mongoMock()

mock.on('error', console.log)

// init mock
mock.start(function(err) {
  // err
})

// teardown
mock.stop(function(err) {
  // err
})
```



### Development

##### this projet has been set up with a precommit that forces you to follow a code style, no jshint issues and 100% of code coverage before commit


to run test
``` js
npm test
```

to run jshint
``` js
npm run jshint
```

to run code style
``` js
npm run code-style
```

to run check code coverage
``` js
npm run check-coverage
```

to open the code coverage report
``` js
npm run open-coverage
```

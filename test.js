for (let i = 0; i < 1000000; i++) {
  someWork()
}

async function someWork () {
  await new Promise((resolve,reject) => {
    console.log('doing some work')

    setTimeout(resolve, 5)
  })

  console.log('did some work')
}

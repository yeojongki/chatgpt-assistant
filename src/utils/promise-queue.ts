class PromiseQueue {
  concurrency: number
  _current: number
  _list: ((...args: any[]) => Promise<any>)[]

  constructor(concurrency = 1) {
    this.concurrency = concurrency
    this._current = 0
    this._list = []
  }

  _loadNext() {
    if (this._list.length === 0 || this.concurrency === this._current) return

    this._current++
    const fn = this._list.shift()
    const promise = fn!()
    promise.then(this.onLoaded.bind(this)).catch(this.onLoaded.bind(this))
  }

  add(promiseFn: (...args: any[]) => Promise<any>) {
    this._list.push(promiseFn)
    this._loadNext()
  }

  onLoaded() {
    this._current--
    this._loadNext()
  }
}

export default PromiseQueue

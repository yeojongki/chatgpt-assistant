const historyKey = 'chatgpt-translate-history'

export function addItemToTranslateHistory(item: Record<string, string>) {
  const history = getTranslateHistory()
  if (history) {
    Object.keys(item).forEach((CN) => {
      const EN = item[CN]
      if (!history[CN]) {
        history[CN] = EN
      }
    })
    localStorage.setItem(historyKey, JSON.stringify(history))
  } else {
    localStorage.setItem(historyKey, JSON.stringify(item))
  }
}

export function addToTranslateHistory(CN: string, EN: string) {
  const history = getTranslateHistory()
  if (history) {
    if (!history[CN]) {
      history[CN] = EN
      localStorage.setItem(historyKey, JSON.stringify(history))
    }
  } else {
    localStorage.setItem(historyKey, JSON.stringify({ [CN]: EN }))
  }
}

export function getTranslateHistory(): undefined | Record<string, string> {
  let result = undefined
  const historyStr = localStorage.getItem(historyKey)
  if (historyStr) {
    try {
      result = JSON.parse(historyStr)
    } catch (error) {
      return undefined
    }
  }

  return result
}

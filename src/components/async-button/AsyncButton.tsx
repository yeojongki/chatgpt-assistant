import { Button, ButtonProps } from 'antd'
import { useState } from 'react'

interface Props extends ButtonProps {
  request: () => Promise<any>
}

const AsyncButton = (props: Props) => {
  const { request, ...rest } = props

  const [loading, setLoading] = useState(false)
  const onClick = async () => {
    try {
      setLoading(true)
      await request()
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return <Button loading={loading} {...rest} onClick={() => onClick()}></Button>
}

export default AsyncButton

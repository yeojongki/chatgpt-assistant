import { NextApiRequest, NextApiResponse } from 'next'
import {
  ChatCompletionRequestMessage,
  Configuration,
  CreateChatCompletionResponseChoicesInner,
  OpenAIApi,
} from 'openai'
import tunnel from 'tunnel'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function (req: NextApiRequest, res: NextApiResponse<any>) {
  if (!configuration.apiKey) {
    res.status(500).json({
      error: {
        message: 'OpenAI API key not configured, please check it!',
      },
    })
    return
  }

  const httpsAgent = tunnel.httpsOverHttp({
    proxy: {
      host: '127.0.0.1',
      port: 7890,
    },
  })

  const modelId = req.body.modelId || 'gpt-3.5-turbo'
  const chineseSentence: string = (req.body.text || '').trim()
  if (chineseSentence.length === 0) {
    res.status(400).json({
      error: {
        message: 'Please enter a valid chineseSentence',
      },
    })
    return
  }

  try {
    if (modelId === 'text-davinci-003') {
      const completion = await openai.createCompletion(
        {
          model: modelId,
          prompt: generatePrompt(chineseSentence),
          temperature: 0.6,
        },
        { httpsAgent },
      )
      res.status(200).json({ result: completion.data.choices[0].text })
    } else if (modelId === 'gpt-3.5-turbo') {
      const chatCompletion = await openai.createChatCompletion(
        {
          model: modelId,
          messages: generateMessage(chineseSentence),
          temperature: 0.6,
        },
        { httpsAgent },
      )

      const choice: CreateChatCompletionResponseChoicesInner =
        chatCompletion?.data?.choices[0]
      res.status(200).json({
        result: choice?.message?.content,
      })
    } else {
      res.status(400).json({
        error: {
          message: 'Please enter a valid model ID',
        },
      })
    }
  } catch (error: any) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data)
      res.status(error.response.status).json(error.response.data)
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`)
      res.status(500).json({
        error: {
          message: 'An error occurred during your request.',
        },
      })
    }
  }
}

const getContent = (chineseSentence: string) => {
  const question = `将这${
    chineseSentence.split('\n').length
  }个句子翻译英语并保留标点: ${chineseSentence}`
  return question
}

function generateMessage(chineseSentence: string) {
  return [
    {
      role: 'user',
      content: getContent(chineseSentence),
    },
  ] as Array<ChatCompletionRequestMessage>
}

function generatePrompt(chineseSentence: string) {
  return getContent(chineseSentence)
}

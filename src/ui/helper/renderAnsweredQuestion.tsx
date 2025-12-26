import { Text } from 'ink'
import React from 'react'

export const renderAnsweredQuestion = (message: string, answer: string) => <Text>
    <Text color='green'>? </Text>
    <Text bold={true}>{message}</Text>
    <Text color='cyan'> {answer}</Text>
</Text>

import { Text } from "ink";
import React from "react";

export const renderQuestion = (message: string) => <Text>
    <Text color='green'>? </Text>
    <Text bold={true}>{message}</Text>
</Text>

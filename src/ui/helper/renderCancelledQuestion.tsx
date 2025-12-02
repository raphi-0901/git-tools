import { Text } from "ink";
import React from "react";

export const renderCancelledQuestion = (message: string) => <Text>
    <Text color='green'>? </Text>
    <Text bold={true}>{message}</Text>
    <Text color='red'> 🚫 Cancel</Text>
</Text>

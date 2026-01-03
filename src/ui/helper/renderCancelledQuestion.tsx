import { Box, Text } from "ink";
import React from "react";

export const renderCancelledQuestion = (message: string) => <Box>
    <Text color='green'>? </Text>
    <Text bold={true}>{message}</Text>
    <Text color='red'> 🚫 Cancel</Text>
</Box>

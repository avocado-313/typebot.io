type Props = {
  secondsToWaitFor: number
}

export const executeWait = async ({ secondsToWaitFor }: Props) => {
  if (!secondsToWaitFor || secondsToWaitFor <= 0) return
  await new Promise((resolve) => setTimeout(resolve, secondsToWaitFor * 1000))
}

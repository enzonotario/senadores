"use client"

type ProgressBarProps = {
  affirmative: number
  negative: number
  abstentions: number
}

export default function ProgressBar({ affirmative, negative, abstentions }: ProgressBarProps) {
  const total = affirmative + negative + abstentions
  const affirmativePercentage = (affirmative / total) * 100
  const negativePercentage = (negative / total) * 100
  const abstentionsPercentage = (abstentions / total) * 100

  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full bg-green-500" style={{ width: `${affirmativePercentage}%`, float: "left" }} />
      <div className="h-full bg-red-500" style={{ width: `${negativePercentage}%`, float: "left" }} />
      <div className="h-full bg-yellow-500" style={{ width: `${abstentionsPercentage}%`, float: "left" }} />
    </div>
  )
}


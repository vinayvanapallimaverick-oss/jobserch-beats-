export default function handler(_request, response) {
  response.status(200).json({
    ok: true,
    provider: 'RapidAPI JSearch',
    configured: Boolean(process.env.RAPIDAPI_KEY)
  });
}
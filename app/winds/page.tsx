import { redirect } from 'next/navigation'

interface WindsRedirectProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WindsRedirect({ searchParams }: WindsRedirectProps) {
  const params = await searchParams;
  const queryString = new URLSearchParams();

  // Preserve all query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => queryString.append(key, v));
      } else {
        queryString.set(key, value);
      }
    }
  });

  const redirectUrl = queryString.toString()
    ? `/course?${queryString.toString()}`
    : '/course';

  redirect(redirectUrl);
}

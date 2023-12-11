type MovieDetails = {
  title: string;
  overview: string;
  release_date?: string;
  production_companies?: { name: string }[];
  genres: { name: string }[];
  credits: {
    cast: { name: string }[];
    crew: { name: string }[];
  };
  "watch/providers": {
    results?: {
      AU?: {
        flatrate: { provider_name: string }[];
        rent: { provider_name: string }[];
        buy: { provider_name: string }[];
      };
    };
  };
};

export type MovieDetailsResponse = {
  id: number;
  title: string;
  description: string;
  release: Date | undefined;
  production?: string;
  genres: string[];
  credits: {
    cast: string[];
    crew: string[];
  };
  providers: { name: string; type: "free" | "rent" | "buy" }[];
};

export class MovieService {
  private AUTH_TOKEN: string;

  constructor() {
    this.AUTH_TOKEN = `Bearer ${process.env.MOVIE_DB_TOKEN}`;
  }

  private async myfetch<T>(url: string): Promise<T> {
    const options = {
      headers: {
        Authorization: this.AUTH_TOKEN,
        accept: "application/json",
      },
    };
    const res = await fetch(`https://api.themoviedb.org/3${url}`, options);
    const json = await res.json();
    return json as T;
  }

  private getCredits(credits: MovieDetails["credits"]) {
    return {
      cast: credits.cast.slice(0, 5).map((item) => item.name),
      crew: credits.crew.slice(0, 5).map((item) => item.name),
    };
  }

  public getStreamingProviders(
    res: MovieDetails["watch/providers"]
  ): MovieDetailsResponse["providers"] {
    if (!res.results || !res.results.AU) {
      return [];
    }
    const auResults = res.results.AU;

    return [
      ...(auResults.flatrate ?? []).map((i) => {
        return {
          name: i.provider_name,
          type: "free" as const,
        };
      }),
      ...(auResults.rent ?? []).map((i) => {
        return {
          name: i.provider_name,
          type: "rent" as const,
        };
      }),
      ...(auResults.buy ?? []).map((i) => {
        return {
          name: i.provider_name,
          type: "buy" as const,
        };
      }),
    ];
  }

  private async getMovieDetails(id: number): Promise<MovieDetailsResponse> {
    const appended = encodeURI("credits,watch/providers");
    const res = await this.myfetch<MovieDetails>(
      `/movie/${id}?append_to_response=${appended}&language=en-US`
    );
    return {
      id,
      title: res.title,
      description: res.overview,
      release: res.release_date ? new Date(res.release_date) : undefined,
      production: (res.production_companies?.[0] ?? {}).name,
      genres: res.genres.map((g) => g.name),
      credits: this.getCredits(res.credits),
      providers: this.getStreamingProviders(res["watch/providers"]),
    };
  }

  public async queryMovieTitle(
    title: string
  ): Promise<MovieDetailsResponse | undefined> {
    const movieQuery = encodeURI(title);
    const res = await this.myfetch<{
      total_results: number;
      results: { id: number }[];
    }>(`/search/movie?query=${movieQuery}&language=en-US&page=1`);
    if (res.total_results === 0) return undefined;
    return this.getMovieDetails(res.results[0].id);
  }
}

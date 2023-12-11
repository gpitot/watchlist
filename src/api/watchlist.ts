import express from "express";
import { validateRequest } from "../middlewares";
import { z } from "zod";
import { MovieDetailsResponse, MovieService } from "../services/movie_service";
import { prisma } from "../services/supabase";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
const router = express.Router();
const movieService = new MovieService();

router.get<{}, { movies: any[] }>("/", async (req, res) => {
  const allMovies = await prisma.movies.findMany({
    include: {
      movie_credits: {
        select: {
          name: true,
          role: true,
        },
      },
      movies_genres: {
        select: {
          genre: true,
        },
      },
      movie_providers: {
        select: {
          provider_name: true,
          provider_type: true,
        },
      },
    },
  });
  return res.json({ movies: allMovies });
});

export const WatchRecord = z.object({
  title: z.string().min(1).max(255),
});

type WatchRecord = z.infer<typeof WatchRecord>;

router.post<{}, MovieDetailsResponse, WatchRecord>(
  "/",
  validateRequest({
    body: WatchRecord,
  }),
  async (req, res) => {
    const { title } = req.body;

    const movieDetails = await movieService.queryMovieTitle(title);

    if (!movieDetails) {
      return res.json(undefined);
    }

    const doesMovieExist = await prisma.movies.findFirst({
      where: {
        title: movieDetails.title,
      },
    });
    if (doesMovieExist) {
      return res.json(movieDetails);
    }

    const movie = await prisma.movies.create({
      data: {
        id: movieDetails.id,
        title: movieDetails.title,
        description: movieDetails.description,
        release_date: movieDetails.release,
        production: movieDetails.production,
      },
    });
    await prisma.movie_credits.createMany({
      data: movieDetails.credits.cast.map((name) => ({
        movie_id: movie.id,
        name: name,
        role: "cast",
      })),
    });
    await prisma.movie_credits.createMany({
      data: movieDetails.credits.crew.map((name) => ({
        movie_id: movie.id,
        name: name,
        role: "crew",
      })),
    });

    await prisma.movies_genres.createMany({
      data: movieDetails.genres.map((genre) => ({
        movie_id: movie.id,
        genre,
      })),
    });

    await prisma.movie_providers.createMany({
      data: movieDetails.providers.map((provider) => ({
        movie_id: movie.id,
        provider_name: provider.name,
        provider_type: provider.type,
      })),
    });

    return res.json(movieDetails);
  }
);

export default router;

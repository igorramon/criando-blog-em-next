import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { FiUser, FiCalendar, FiClock } from 'react-icons/fi';
import Head from 'next/head';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { RichText } from 'prismic-dom';
import { getPrismicClient } from '../../services/prismic';
import Header from '../../components/Header';
import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const { isFallback } = useRouter();
  function readingTime(): number {
    const text = post.data.content.reduce((acc, content) => {
      acc += `${content.heading}`;

      const body = RichText.asText(content.body);

      acc += body;

      return acc;
    }, '');

    const wordCount = text.split(/\s+/).length;

    return Math.ceil(wordCount / 200);
  }
  if (isFallback) {
    return <h1>Carregando...</h1>;
  }
  return (
    <>
      <Head>
        <title>{post.data.title} | Ignews</title>
      </Head>
      <Header />
      <img className={styles.banner} src={post.data.banner.url} alt="banner" />
      <main className={commonStyles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>
          <div>
            <time>
              <FiCalendar />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <span>
              <FiUser />
              {post.data.author}
            </span>
            <span>
              <FiClock />
              {readingTime()} min
            </span>
          </div>
          {post.data.content.map(c => (
            <section key={c.heading} className={styles.postContent}>
              <h2>{c.heading}</h2>
              <div
                dangerouslySetInnerHTML={{ __html: RichText.asHtml(c.body) }}
              />
            </section>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    { pageSize: 2, fetch: ['posts.uid'] }
  );

  const paths = posts.results.map(post => ({ params: { slug: post.uid } }));

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const content = response.data.content.map(c => {
    return { heading: c.heading, body: c.body };
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content,
    },
  };

  return {
    props: {
      post,
    },
  };
};

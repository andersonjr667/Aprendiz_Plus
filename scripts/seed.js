require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Job = require('../models/Job');
const News = require('../models/News');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function seed(){
  await mongoose.connect(MONGO_URI);
  console.log('Connected');
  await Promise.all([User.deleteMany(), Job.deleteMany(), News.deleteMany()]);
  const password = await bcrypt.hash('password123', 10);
  const owner = await User.create({ name: 'Dono do Sistema', email: 'dono@local', passwordHash: password, type: 'owner' });
  const admin = await User.create({ name: 'Admin', email: 'admin@local', passwordHash: password, type: 'admin' });
  const companyA = await User.create({ name: 'Empresa A', email: 'a@empresa', passwordHash: password, type: 'empresa', companyProfile: { website: 'https://empresa-a.local' } });
  const companyB = await User.create({ name: 'Empresa B', email: 'b@empresa', passwordHash: password, type: 'empresa', companyProfile: { website: 'https://empresa-b.local' } });
  const c1 = await User.create({ name: 'Candidato 1', email: 'c1@local', passwordHash: password, type: 'candidato', candidateProfile: { skills: ['javascript','nodejs'] } });
  const c2 = await User.create({ name: 'Candidato 2', email: 'c2@local', passwordHash: password, type: 'candidato', candidateProfile: { skills: ['python','ml'] } });
  const c3 = await User.create({ name: 'Candidato 3', email: 'c3@local', passwordHash: password, type: 'candidato', candidateProfile: { skills: ['java','spring'] } });

  const j1 = await Job.create({ 
    title: 'Desenvolvedor Node.js Junior', 
    description: 'Estamos procurando um desenvolvedor Node.js junior para integrar nossa equipe de backend. Você trabalhará no desenvolvimento de APIs RESTful, integração com bancos de dados MongoDB e MySQL, e colaborará com equipes multidisciplinares para criar soluções escaláveis.', 
    requirements: ['JavaScript', 'Node.js', 'Express.js', 'MongoDB', 'Git'],
    benefits: ['Vale alimentação', 'Vale transporte', 'Plano de saúde', 'Ambiente jovem', 'Oportunidades de crescimento'],
    salary: 'R$ 3.000 - R$ 4.500',
    location: 'São Paulo, SP',
    workModel: 'híbrido',
    company: companyA._id,
    status: 'aberta'
  });
  
  const j2 = await Job.create({ 
    title: 'Desenvolvedor Frontend React', 
    description: 'Vaga para desenvolvedor frontend especializado em React. Você será responsável por criar interfaces modernas e responsivas, trabalhar com APIs REST, e garantir uma excelente experiência do usuário. Trabalhamos com as tecnologias mais modernas do mercado.',
    requirements: ['React.js', 'JavaScript ES6+', 'HTML5', 'CSS3', 'Git'],
    benefits: ['Salário competitivo', 'Vale refeição', 'Convênio médico', 'Flexibilidade de horários'],
    salary: 'R$ 3.500 - R$ 5.000',
    location: 'Rio de Janeiro, RJ',
    workModel: 'remoto',
    company: companyA._id,
    status: 'aberta'
  });
  
  const j3 = await Job.create({ 
    title: 'Engenheiro de Machine Learning', 
    description: 'Oportunidade para trabalhar com projetos de inteligência artificial e ciência de dados. Você desenvolverá modelos de ML, fará análise exploratória de dados, e implementará soluções de IA para resolver problemas reais de negócio.',
    requirements: ['Python', 'Pandas', 'Scikit-learn', 'TensorFlow', 'PyTorch'],
    benefits: ['Excelente pacote de benefícios', 'Ambiente inovador', 'Participação nos lucros'],
    salary: 'R$ 6.000 - R$ 9.000',
    location: 'Belo Horizonte, MG',
    workModel: 'presencial',
    company: companyB._id,
    status: 'aberta'
  });
  
  const j4 = await Job.create({ 
    title: 'Desenvolvedor Java Full Stack', 
    description: 'Estamos buscando um desenvolvedor Java para trabalhar em projetos full stack. Você desenvolverá tanto o backend com Spring Boot quanto o frontend, trabalhando em um ambiente ágil e colaborativo.',
    requirements: ['Java 8+', 'Spring Boot', 'Spring MVC', 'JPA/Hibernate'],
    benefits: ['Vale alimentação', 'Plano de saúde familiar', 'Licença maternidade/paternidade estendida'],
    salary: 'R$ 4.000 - R$ 6.500',
    location: 'Porto Alegre, RS',
    workModel: 'híbrido',
    company: companyB._id,
    status: 'aberta'
  });

  // Create test news
  const newsData = [
    {
      title: 'Mercado de Trabalho Aquecido para Desenvolvedores Junior',
      content: 'O mercado de tecnologia continua em expansão, criando diversas oportunidades para desenvolvedores iniciantes. Empresas estão investindo pesadamente em programas de trainee e estágio, oferecendo salários competitivos e benefícios atrativos. As tecnologias mais procuradas incluem JavaScript, Python, React e Node.js. Para se destacar, é importante ter um portfólio sólido no GitHub e conhecimento em metodologias ágeis.',
      category: 'Mercado de Trabalho',
      author: owner._id,
      createdAt: new Date('2024-11-01')
    },
    {
      title: 'Dicas Essenciais para Entrevistas de Emprego Online',
      content: 'Com o crescimento do trabalho remoto, as entrevistas online se tornaram padrão no processo seletivo. Algumas dicas importantes: teste sua conexão de internet e equipamentos antecipadamente, escolha um ambiente bem iluminado e silencioso, vista-se adequadamente, prepare-se para perguntas técnicas e comportamentais, e tenha uma cópia do seu currículo em mãos. Lembre-se de manter contato visual com a câmera e demonstrar entusiasmo pela oportunidade.',
      category: 'Carreira',
      author: owner._id,
      createdAt: new Date('2024-10-28')
    },
    {
      title: 'Novas Tecnologias que Todo Jovem Profissional Deve Conhecer',
      content: 'A tecnologia evolui rapidamente e é crucial se manter atualizado. Em 2024, algumas tecnologias ganham destaque: Inteligência Artificial e Machine Learning estão revolucionando diversos setores, desenvolvimento mobile com Flutter e React Native oferece ótimas oportunidades, cloud computing (AWS, Azure, Google Cloud) é essencial para infraestrutura moderna, e cybersecurity se torna cada vez mais importante. Investir tempo em aprender essas tecnologias pode abrir muitas portas.',
      category: 'Tecnologia',
      author: owner._id,
      createdAt: new Date('2024-10-25')
    },
    {
      title: 'Lei do Jovem Aprendiz: Benefícios e Oportunidades',
      content: 'A Lei do Jovem Aprendiz (Lei 10.097/2000) determina que empresas de médio e grande porte contratem entre 5% e 15% de aprendizes do total de funcionários. Este programa oferece experiência profissional real, capacitação técnica, registro em carteira, salário mínimo/hora, vale-transporte e 13º salário. É uma excelente porta de entrada no mercado de trabalho, especialmente para jovens entre 14 e 24 anos que buscam sua primeira oportunidade profissional.',
      category: 'Legislação',
      author: owner._id,
      createdAt: new Date('2024-10-22')
    },
    {
      title: 'Como Criar um Currículo Atrativo para Recém-Formados',
      content: 'Para recém-formados sem experiência profissional, o currículo deve destacar outros pontos fortes: formação acadêmica com projetos relevantes, estágios e trabalhos voluntários, cursos complementares e certificações, habilidades técnicas e linguagens de programação, participação em eventos e hackathons, e projetos pessoais no GitHub. Mantenha o design limpo e profissional, use palavras-chave da área, e personalize o currículo para cada vaga. Um bom currículo pode compensar a falta de experiência formal.',
      category: 'Carreira',
      author: owner._id,
      createdAt: new Date('2024-10-20')
    },
    {
      title: 'Programa de Estágios 2025: Principais Empresas Abertas',
      content: 'O período de inscrições para programas de estágio 2025 já começou em várias empresas. Grandes corporações como Banco do Brasil, Petrobras, Vale, Ambev, e diversas fintechs estão com processos seletivos abertos. Os programas geralmente oferecem bolsa-auxílio competitiva, vale-refeição, vale-transporte, seguro de vida, e oportunidades de efetivação. É importante ficar atento aos prazos e requisitos específicos de cada empresa. Prepare-se para testes online, dinâmicas de grupo e entrevistas comportamentais.',
      category: 'Oportunidades',
      author: owner._id,
      createdAt: new Date('2024-10-18')
    },
    {
      title: 'Soft Skills: Competências Essenciais para o Mercado Atual',
      content: 'Além das habilidades técnicas, as soft skills são fundamentais para o sucesso profissional. As mais valorizadas incluem: comunicação eficaz, trabalho em equipe, adaptabilidade, resolução de problemas, liderança, gestão de tempo, pensamento crítico, e inteligência emocional. Desenvolva essas competências através de projetos em grupo, atividades extracurriculares, voluntariado, e feedback constante. Muitas empresas valorizam mais candidatos com boas soft skills do que apenas conhecimento técnico.',
      category: 'Desenvolvimento',
      author: owner._id,
      createdAt: new Date('2024-10-15')
    },
    {
      title: 'Tendências do Mercado de Trabalho para 2025',
      content: 'O mercado de trabalho continua evoluindo rapidamente. As principais tendências para 2025 incluem: crescimento do trabalho híbrido e remoto, maior foco em sustentabilidade e ESG, automatização de processos repetitivos, valorização da diversidade e inclusão, uso de IA no recrutamento, upskilling e reskilling contínuos, e flexibilidade de horários. Profissionais que se adaptarem a essas mudanças terão vantagem competitiva. É importante desenvolver habilidades digitais e manter-se atualizado com as transformações do setor.',
      category: 'Mercado de Trabalho',
      author: owner._id,
      createdAt: new Date('2024-10-12')
    }
  ];

  await News.insertMany(newsData);
  console.log('News created');

  console.log('\n=== Seed concluído com sucesso! ===');
  console.log('\n📧 Contas de teste criadas:');
  console.log('👑 DONO: dono@local / password123');
  console.log('👤 ADMIN: admin@local / password123');
  console.log('🏢 EMPRESA A: a@empresa / password123');
  console.log('🏢 EMPRESA B: b@empresa / password123');
  console.log('👨 CANDIDATO 1: c1@local / password123');
  console.log('👨 CANDIDATO 2: c2@local / password123');
  console.log('👨 CANDIDATO 3: c3@local / password123\n');

  console.log('Seed done');
  process.exit(0);
}

seed().catch(err=>{ console.error(err); process.exit(1); });

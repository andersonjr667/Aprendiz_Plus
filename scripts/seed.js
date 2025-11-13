require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Job = require('../models/Job');
const News = require('../models/News');
const { env } = require('@tensorflow/tfjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aprendiz_plus';

async function seed(){
  await mongoose.connect(MONGO_URI);
  console.log('Connected');
  await Promise.all([User.deleteMany(), Job.deleteMany(), News.deleteMany()]);
  const password = await bcrypt.hash('password123', 10);
  const password2 = await bcrypt.hash('senha456', 10);
  // Adicionando perfis variados de usuários
  const empresaSaude = await User.create({ name: 'Clínica Vida', email: 'contato@clinicavida.com', passwordHash: password, type: 'empresa', cnpj: '22.333.444/0001-55', companyProfile: { website: 'https://clinicavida.com', tradeName: 'Clínica Vida', legalName: 'Clínica Vida Saúde LTDA', businessArea: 'Saúde', numberOfEmployees: 20, city: 'Campinas', state: 'SP', corporateEmail: 'rh@clinicavida.com', commercialPhone: '(19) 4002-1234' }, emailVerified: true });
  const empresaConstrucao = await User.create({ name: 'Construtora Alpha', email: 'contato@alpha.com', passwordHash: password2, type: 'empresa', cnpj: '33.444.555/0001-66', companyProfile: { website: 'https://alpha.com', tradeName: 'Construtora Alpha', legalName: 'Alpha Engenharia S.A.', businessArea: 'Construção Civil', numberOfEmployees: 200, city: 'Salvador', state: 'BA', corporateEmail: 'contato@alpha.com', commercialPhone: '(71) 3003-4567' }, emailVerified: true });
  // Usuários principais (devem ser criados antes de qualquer uso)
  const owner = await User.create({ name: 'Anderson Jr', email: 'alsj1520@gmail.com', passwordHash: password, type: 'owner', cpf: '123.456.789-00', phone: '(11) 99999-0000', bio: 'Fundador do Aprendiz Plus', avatarUrl: '', emailVerified: true });
  const admin = await User.create({ name: 'Admin', email: 'admin@local', passwordHash: password, type: 'admin', cpf: '111.222.333-44', phone: '(21) 98888-1111', bio: 'Administrador do sistema', emailVerified: true });
  const admin2 = await User.create({ name: 'Admin 2', email: 'admin2@local', passwordHash: password2, type: 'admin', cpf: '222.333.444-55', phone: '(31) 97777-2222', bio: 'Admin secundário', emailVerified: true });
  const adminPerms = await User.create({ name: 'Admin Master', email: 'master@local', passwordHash: password, type: 'admin', cpf: '888.999.000-11', phone: '(61) 99999-8888', bio: 'Admin com permissões totais', emailVerified: true });
  const adminRestrito = await User.create({ name: 'Admin Restrito', email: 'restrito@local', passwordHash: password2, type: 'admin', cpf: '999.000.111-22', phone: '(62) 98888-9999', bio: 'Admin com permissões restritas', emailVerified: true });
  const companyA = await User.create({ name: 'Empresa A', email: 'a@empresa', passwordHash: password, type: 'empresa', cnpj: '12.345.678/0001-00', companyProfile: { website: 'https://empresa-a.local', tradeName: 'Empresa A', legalName: 'Empresa A LTDA', businessArea: 'Tecnologia', numberOfEmployees: 50, city: 'São Paulo', state: 'SP', corporateEmail: 'contato@empresa-a.local', commercialPhone: '(11) 4002-8922' }, emailVerified: true });
  const companyB = await User.create({ name: 'Empresa B', email: 'b@empresa', passwordHash: password, type: 'empresa', cnpj: '98.765.432/0001-99', companyProfile: { website: 'https://empresa-b.local', tradeName: 'Empresa B', legalName: 'Empresa B S.A.', businessArea: 'Educação', numberOfEmployees: 120, city: 'Belo Horizonte', state: 'MG', corporateEmail: 'rh@empresa-b.local', commercialPhone: '(31) 3003-1234' }, emailVerified: true });
  const companyC = await User.create({ name: 'Empresa C', email: 'c@empresa', passwordHash: password2, type: 'empresa', cnpj: '11.222.333/0001-44', companyProfile: { website: 'https://empresa-c.local', tradeName: 'Empresa C', legalName: 'Empresa C ME', businessArea: 'Saúde', numberOfEmployees: 30, city: 'Curitiba', state: 'PR', corporateEmail: 'contato@empresa-c.local', commercialPhone: '(41) 4004-5678' }, emailVerified: true });
  // Candidatos
  const c1 = await User.create({ name: 'Candidato 1', email: 'c1@local', passwordHash: password, type: 'candidato', cpf: '333.444.555-66', candidateProfile: { skills: ['javascript','nodejs'], bio: 'Desenvolvedor backend', education: 'Ensino Médio Completo', gender: 'masculino', city: 'São Paulo', state: 'SP', linkedinUrl: 'https://linkedin.com/in/candidato1', areasOfInterest: ['Desenvolvimento', 'TI'], availability: 'integral', isPCD: false, currentEducation: 'medio-completo', educationInstitution: 'E.E. São Paulo', studyShift: 'manha' }, emailVerified: true });
  const c2 = await User.create({ name: 'Candidato 2', email: 'c2@local', passwordHash: password, type: 'candidato', cpf: '444.555.666-77', candidateProfile: { skills: ['python','ml'], bio: 'Aspirante a cientista de dados', education: 'Superior Cursando', gender: 'feminino', city: 'Rio de Janeiro', state: 'RJ', linkedinUrl: 'https://linkedin.com/in/candidato2', areasOfInterest: ['Dados', 'IA'], availability: 'tarde', isPCD: true, pcdDescription: 'Deficiência auditiva', currentEducation: 'superior-cursando', educationInstitution: 'UFRJ', studyShift: 'tarde' }, emailVerified: true });
  const c3 = await User.create({ name: 'Candidato 3', email: 'c3@local', passwordHash: password, type: 'candidato', cpf: '555.666.777-88', candidateProfile: { skills: ['java','spring'], bio: 'Desenvolvedor Java', education: 'Superior Completo', gender: 'masculino', city: 'Belo Horizonte', state: 'MG', linkedinUrl: 'https://linkedin.com/in/candidato3', areasOfInterest: ['Desenvolvimento', 'Backend'], availability: 'manha', isPCD: false, currentEducation: 'superior-completo', educationInstitution: 'PUC Minas', studyShift: 'noite' }, emailVerified: true });
  const c4 = await User.create({ name: 'Candidata 4', email: 'c4@local', passwordHash: password2, type: 'candidato', cpf: '666.777.888-99', candidateProfile: { skills: ['html','css','javascript'], bio: 'Frontend apaixonada por UI/UX', education: 'Médio Completo', gender: 'feminino', city: 'Curitiba', state: 'PR', linkedinUrl: 'https://linkedin.com/in/candidata4', areasOfInterest: ['Frontend', 'Design'], availability: 'flexivel', isPCD: false, currentEducation: 'medio-completo', educationInstitution: 'Colégio Estadual', studyShift: 'manha' }, emailVerified: true });
  const c5 = await User.create({ name: 'Candidato 5', email: 'c5@local', passwordHash: password2, type: 'candidato', cpf: '777.888.999-00', candidateProfile: { skills: ['php','laravel'], bio: 'Desenvolvedor PHP', education: 'Superior Cursando', gender: 'masculino', city: 'Porto Alegre', state: 'RS', linkedinUrl: 'https://linkedin.com/in/candidato5', areasOfInterest: ['Web', 'Backend'], availability: 'noite', isPCD: false, currentEducation: 'superior-cursando', educationInstitution: 'UFRGS', studyShift: 'noite' }, emailVerified: true });
  // Candidato PCD
  const c6 = await User.create({ name: 'Candidato PCD', email: 'pcd@local', passwordHash: password, type: 'candidato', cpf: '888.777.666-55', candidateProfile: { skills: ['excel','atendimento'], bio: 'PCD com experiência em atendimento', education: 'Médio Completo', gender: 'feminino', city: 'Brasília', state: 'DF', linkedinUrl: 'https://linkedin.com/in/pcd', areasOfInterest: ['Administrativo'], availability: 'manha', isPCD: true, pcdDescription: 'Deficiência física - membro inferior', currentEducation: 'medio-completo', educationInstitution: 'Colégio DF', studyShift: 'manha' }, emailVerified: true, avatarUrl: '/public/images/opportunities-icon.svg', resumeUrl: 'https://meucurriculo.com/pcd.pdf' });
  // Candidato com foto e currículo
  const c7 = await User.create({ name: 'Candidato Foto', email: 'foto@local', passwordHash: password2, type: 'candidato', cpf: '999.888.777-66', candidateProfile: { skills: ['marketing','design'], bio: 'Designer e marketeiro', education: 'Superior Completo', gender: 'outro', city: 'Recife', state: 'PE', linkedinUrl: 'https://linkedin.com/in/foto', areasOfInterest: ['Design', 'Marketing'], availability: 'integral', isPCD: false, currentEducation: 'superior-completo', educationInstitution: 'UFPE', studyShift: 'tarde' }, emailVerified: true, avatarUrl: '/public/images/logo.png', resumeUrl: 'https://meucurriculo.com/foto.pdf' });

  // Vagas variadas
  const vagasExtras = [
    {
      title: 'Auxiliar de Enfermagem',
      description: 'Atendimento a pacientes, organização de prontuários, suporte à equipe médica.',
      requirements: ['Curso Técnico de Enfermagem', 'Empatia', 'Organização'],
      benefits: ['Vale transporte', 'Plano de saúde', 'Refeitório no local'],
      salary: 'R$ 2.200',
      location: 'Campinas, SP',
      workModel: 'presencial',
      company: empresaSaude._id,
      status: 'aberta'
    },
    {
      title: 'Engenheiro Civil Pleno',
      description: 'Gestão de obras, acompanhamento de cronogramas e equipes.',
      requirements: ['CREA ativo', 'Experiência em obras', 'AutoCAD'],
      benefits: ['Vale alimentação', 'Carro da empresa', 'PLR'],
      salary: 'R$ 8.000',
      location: 'Salvador, BA',
      workModel: 'híbrido',
      company: empresaConstrucao._id,
      status: 'aberta'
    },
    {
      title: 'Assistente Administrativo PCD',
      description: 'Vaga exclusiva para PCD. Apoio administrativo, atendimento telefônico, organização de documentos.',
      requirements: ['PCD', 'Pacote Office', 'Boa comunicação'],
      benefits: ['Vale transporte', 'Vale alimentação', 'Ambiente inclusivo'],
      salary: 'R$ 2.000',
      location: 'Brasília, DF',
      workModel: 'presencial',
      company: empresaSaude._id,
      status: 'aberta'
    }
  ];
  await Job.insertMany(vagasExtras);

  // Simular aplicações de candidatos em vagas
  const Application = require('../models/Application');
  const allJobs = await Job.find();
  await Application.create({ candidate: c1._id, job: allJobs[0]._id, status: 'pending', resumeUrl: 'https://meucurriculo.com/c1.pdf' });
  await Application.create({ candidate: c2._id, job: allJobs[1]._id, status: 'accepted', resumeUrl: 'https://meucurriculo.com/c2.pdf' });
  await Application.create({ candidate: c6._id, job: allJobs[allJobs.length-1]._id, status: 'pending', resumeUrl: 'https://meucurriculo.com/pcd.pdf' });

  // Adicionar notificações de teste
  const Notification = require('../models/Notification');
  await Notification.create({ userId: c1._id.toString(), type: 'application', title: 'Nova vaga disponível!', message: 'Confira a vaga de Desenvolvedor Node.js Junior.', link: '/vagas' });
  await Notification.create({ userId: c6._id.toString(), type: 'application', title: 'Vaga PCD aberta', message: 'Vaga exclusiva para PCD disponível.', link: '/vagas' });

  // Adicionar logs de auditoria
  const AuditLog = require('../models/AuditLog');
  await AuditLog.create({ action: 'user_login', userId: admin._id, resourceType: 'User', resourceId: admin._id, details: { ip: '127.0.0.1' } });
  await AuditLog.create({ action: 'job_created', userId: companyA._id, resourceType: 'Job', resourceId: allJobs[0]._id, details: { title: allJobs[0].title } });

  // Adicionar mensagens e chats
  const Chat = require('../models/Chat');
  const Message = require('../models/Message');
  const chat1 = await Chat.create({ candidateId: c1._id, companyId: companyA._id, jobId: allJobs[0]._id });
  await Message.create({ chatId: chat1._id, senderId: c1._id, senderType: 'candidato', content: 'Olá, gostaria de saber mais sobre a vaga.' });
  await Message.create({ chatId: chat1._id, senderId: companyA._id, senderType: 'empresa', content: 'Olá! A vaga é para início imediato.' });

  // Adicionar reviews e favoritos
  const Review = require('../models/Review');
  await Review.create({ reviewerId: c1._id.toString(), reviewerType: 'candidate', targetId: companyA._id.toString(), targetType: 'company', jobId: allJobs[0]._id.toString(), rating: 5, comment: 'Ótima empresa!', pros: ['Ambiente saudável'], cons: [], anonymous: false });
  const { Favorite } = require('../models/Favorite');
  await Favorite.create({ userId: c1._id.toString(), targetId: allJobs[0]._id.toString(), targetType: 'job', notes: 'Quero acompanhar esta vaga' });

  // Popular campos de perfil (fotos, currículos, links já adicionados acima)


  // Vagas
  const jobs = [
    {
      title: 'Desenvolvedor Node.js Junior',
      description: 'Estamos procurando um desenvolvedor Node.js junior para integrar nossa equipe de backend. Você trabalhará no desenvolvimento de APIs RESTful, integração com bancos de dados MongoDB e MySQL, e colaborará com equipes multidisciplinares para criar soluções escaláveis.',
      requirements: ['JavaScript', 'Node.js', 'Express.js', 'MongoDB', 'Git'],
      benefits: ['Vale alimentação', 'Vale transporte', 'Plano de saúde', 'Ambiente jovem', 'Oportunidades de crescimento'],
      salary: 'R$ 3.000 - R$ 4.500',
      location: 'São Paulo, SP',
      workModel: 'híbrido',
      company: companyA._id,
      status: 'aberta'
    },
    {
      title: 'Desenvolvedor Frontend React',
      description: 'Vaga para desenvolvedor frontend especializado em React. Você será responsável por criar interfaces modernas e responsivas, trabalhar com APIs REST, e garantir uma excelente experiência do usuário. Trabalhamos com as tecnologias mais modernas do mercado.',
      requirements: ['React.js', 'JavaScript ES6+', 'HTML5', 'CSS3', 'Git'],
      benefits: ['Salário competitivo', 'Vale refeição', 'Convênio médico', 'Flexibilidade de horários'],
      salary: 'R$ 3.500 - R$ 5.000',
      location: 'Rio de Janeiro, RJ',
      workModel: 'remoto',
      company: companyA._id,
      status: 'aberta'
    },
    {
      title: 'Engenheiro de Machine Learning',
      description: 'Oportunidade para trabalhar com projetos de inteligência artificial e ciência de dados. Você desenvolverá modelos de ML, fará análise exploratória de dados, e implementará soluções de IA para resolver problemas reais de negócio.',
      requirements: ['Python', 'Pandas', 'Scikit-learn', 'TensorFlow', 'PyTorch'],
      benefits: ['Excelente pacote de benefícios', 'Ambiente inovador', 'Participação nos lucros'],
      salary: 'R$ 6.000 - R$ 9.000',
      location: 'Belo Horizonte, MG',
      workModel: 'presencial',
      company: companyB._id,
      status: 'aberta'
    },
    {
      title: 'Desenvolvedor Java Full Stack',
      description: 'Estamos buscando um desenvolvedor Java para trabalhar em projetos full stack. Você desenvolverá tanto o backend com Spring Boot quanto o frontend, trabalhando em um ambiente ágil e colaborativo.',
      requirements: ['Java 8+', 'Spring Boot', 'Spring MVC', 'JPA/Hibernate'],
      benefits: ['Vale alimentação', 'Plano de saúde familiar', 'Licença maternidade/paternidade estendida'],
      salary: 'R$ 4.000 - R$ 6.500',
      location: 'Porto Alegre, RS',
      workModel: 'híbrido',
      company: companyB._id,
      status: 'aberta'
    },
    {
      title: 'Estágio em Suporte Técnico',
      description: 'Auxiliar no suporte técnico a usuários internos, manutenção de computadores e redes, e atendimento de chamados.',
      requirements: ['Windows', 'Redes', 'Atendimento ao cliente'],
      benefits: ['Bolsa auxílio', 'Vale transporte'],
      salary: 'R$ 1.200',
      location: 'Curitiba, PR',
      workModel: 'presencial',
      company: companyC._id,
      status: 'aberta'
    },
    {
      title: 'Analista de RH',
      description: 'Responsável pelo recrutamento, seleção e treinamento de novos colaboradores.',
      requirements: ['Psicologia', 'Recursos Humanos', 'Comunicação'],
      benefits: ['Vale alimentação', 'Plano odontológico'],
      salary: 'R$ 3.000',
      location: 'São Paulo, SP',
      workModel: 'híbrido',
      company: companyA._id,
      status: 'aberta'
    },
    {
      title: 'Desenvolvedor Mobile Flutter',
      description: 'Desenvolvimento de aplicativos móveis multiplataforma usando Flutter.',
      requirements: ['Flutter', 'Dart', 'APIs REST'],
      benefits: ['Vale refeição', 'Horário flexível'],
      salary: 'R$ 4.500',
      location: 'Belo Horizonte, MG',
      workModel: 'remoto',
      company: companyB._id,
      status: 'aberta'
    },
    {
      title: 'Auxiliar Administrativo',
      description: 'Atendimento telefônico, organização de documentos e apoio administrativo.',
      requirements: ['Organização', 'Pacote Office'],
      benefits: ['Vale transporte', 'Vale alimentação'],
      salary: 'R$ 1.800',
      location: 'Curitiba, PR',
      workModel: 'presencial',
      company: companyC._id,
      status: 'aberta'
    },
    {
      title: 'Estágio em Marketing Digital',
      description: 'Auxiliar na criação de campanhas digitais, gestão de redes sociais e análise de métricas.',
      requirements: ['Marketing', 'Redes Sociais', 'Google Analytics'],
      benefits: ['Bolsa auxílio', 'Vale transporte'],
      salary: 'R$ 1.300',
      location: 'São Paulo, SP',
      workModel: 'híbrido',
      company: companyA._id,
      status: 'aberta'
    }
  ];
  await Job.insertMany(jobs);

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
  console.log('👑 DONO: alsj1520@gmail.com / password123');
  console.log('👤 ADMIN: admin@local / password123');
  console.log('👤 ADMIN 2: admin2@local / senha456');
  console.log('👤 ADMIN MASTER: master@local / password123');
  console.log('👤 ADMIN RESTRITO: restrito@local / senha456');
  console.log('🏢 EMPRESA A: a@empresa / password123');
  console.log('🏢 EMPRESA B: b@empresa / password123');
  console.log('🏢 EMPRESA C: c@empresa / senha456');
  console.log('🏢 CLÍNICA VIDA: contato@clinicavida.com / password123');
  console.log('🏢 CONSTRUTORA ALPHA: contato@alpha.com / senha456');
  console.log('👨 CANDIDATO 1: c1@local / password123');
  console.log('� CANDIDATO 2: c2@local / password123');
  console.log('👨 CANDIDATO 3: c3@local / password123');
  console.log('👩 CANDIDATA 4: c4@local / senha456');
  console.log('👨 CANDIDATO 5: c5@local / senha456');
  console.log('♿ CANDIDATO PCD: pcd@local / password123');
  console.log('🖼️ CANDIDATO FOTO: foto@local / senha456');

  console.log('\n💼 Vagas criadas:', (await Job.countDocuments()));
  console.log('📄 Aplicações simuladas:', (await require('../models/Application').countDocuments()));
  console.log('🔔 Notificações criadas:', (await require('../models/Notification').findByUserId(c1._id.toString())).length + (await require('../models/Notification').findByUserId(c6._id.toString())).length);
  console.log('📝 Logs de auditoria:', (await require('../models/AuditLog').countDocuments()));
  console.log('💬 Mensagens de chat:', (await require('../models/Message').countDocuments()));
  console.log('⭐ Reviews criadas:', (await require('../models/Review').findByTargetId(companyA._id.toString())).length);
  console.log('❤️ Favoritos criados:', '1+');

  console.log('\nSeed done!');
  process.exit(0);
}

seed().catch(err=>{ console.error(err); process.exit(1); });

export interface Service {
  id: string;
  number: string;
  title: string;
  short: string;
  price: string;
  priceNote?: string;
  summary: string;
  includes: string[];
  goodFit: string[];
  cta: { label: string; href: string };
}

export const services: Service[] = [
  {
    id: 'website-overhauls',
    number: '01',
    title: 'Website Overhauls',
    short:
      'Modernize an existing website with stronger design, mobile responsiveness, and clearer paths for customers to get in touch.',
    price: 'Starting at $1,500',
    summary:
      'Your current website should be working for you, not against you. We rebuild outdated or underperforming sites into fast, modern, mobile-friendly websites that represent your business properly and make it easy for customers to take the next step.',
    includes: [
      'Refreshed visual design aligned with your brand',
      'Fully responsive layouts for phones, tablets, and desktops',
      'Usability improvements to navigation and page structure',
      'Accessibility improvements following WCAG guidance',
      'Basic on-page SEO: titles, descriptions, headings, and sitemaps',
      'Clear lead-generation pathways: calls to action, contact forms, and click-to-call',
    ],
    goodFit: [
      'Your site looks dated or doesn’t reflect the quality of your work',
      'It’s hard to use on a phone',
      'Visitors aren’t contacting you from the website',
    ],
    cta: { label: 'Get a Free Website Audit', href: '/contact?service=website-overhaul' },
  },
  {
    id: 'new-website-development',
    number: '02',
    title: 'New Website Development',
    short: 'Custom business websites designed around your brand, your services, and how your customers make decisions.',
    price: 'Individually quoted',
    summary:
      'Starting fresh or outgrowing a template? We plan, design, and build custom websites around your services and your customer journey — from the first search result to the moment someone reaches out.',
    includes: [
      'Discovery session to understand your business and customers',
      'Site structure and content planning',
      'Custom design built around your brand',
      'Hand-built, fast-loading pages',
      'Contact forms, inquiry flows, and integrations as needed',
      'Search-ready technical foundations and launch support',
    ],
    goodFit: [
      'You’re launching a new business or service line',
      'You need functionality a template can’t provide',
      'You want a site built to grow with the business',
    ],
    cta: { label: 'Discuss a New Website', href: '/contact?service=new-website' },
  },
  {
    id: 'business-digital-solutions',
    number: '03',
    title: 'Business Digital Solutions',
    short:
      'Scoped projects for professional business email, Google Business Profile optimization, and better day-to-day digital systems.',
    price: 'Scoped per project',
    summary:
      'A strong online presence goes beyond the website. We help businesses put professional, reliable digital foundations in place so they look established and operate more smoothly.',
    includes: [
      'Professional business email setup or migration on your own domain',
      'Google Business Profile setup review and optimization',
      'Domain and DNS organization',
      'Practical improvements to the digital tools your team uses',
    ],
    goodFit: [
      'You’re still using a personal email address for business',
      'Your Google listing is incomplete or out of date',
      'Your domain, email, and accounts are scattered or undocumented',
    ],
    cta: { label: 'Talk About Your Setup', href: '/contact?service=digital-solutions' },
  },
];

export const careService: Service = {
  id: 'ongoing-website-care',
  number: '04',
  title: 'Ongoing Website Care',
  short: 'Optional monthly maintenance, monitoring, routine updates, and clearly defined support.',
  price: 'Request a quote',
  priceNote: 'Care plan pricing is provided on request.',
  summary:
    'Websites need regular attention to stay secure, fast, and accurate. Our optional care plans keep your site maintained and give you a clear, dependable way to request updates.',
  includes: [
    'Uptime monitoring',
    'Routine technical updates and maintenance',
    'Small content and copy updates',
    'Periodic checks of forms, links, and performance',
    'Clearly defined support scope, so you always know what’s covered',
  ],
  goodFit: [
    'You don’t have time to maintain your website',
    'You want someone dependable to call when something needs to change',
  ],
  cta: { label: 'Request a Quote', href: '/contact?service=website-care' },
};

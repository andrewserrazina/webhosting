import type { ImageMetadata } from 'astro';
import dcDesktop from '../assets/work/dc-granite-and-marble-desktop.png';
import dcLong from '../assets/work/dc-granite-and-marble-desktop-long.png';
import dcMobile from '../assets/work/dc-granite-and-marble-mobile.png';
import rfDesktop from '../assets/work/realtorfinder-desktop.png';
import rfLong from '../assets/work/realtorfinder-desktop-long.png';
import rfMobile from '../assets/work/realtorfinder-mobile.png';
import apexDesktop from '../assets/work/apex-aviation-desktop.png';
import apexLong from '../assets/work/apex-aviation-desktop-long.png';
import apexMobile from '../assets/work/apex-aviation-mobile.png';

/*
 * Portfolio content. Everything here describes publicly visible features of
 * each live website. Do not add metrics, testimonials, or quotes unless they
 * are verified and approved by the client.
 */

export interface Project {
  slug: string;
  name: string;
  url: string;
  displayUrl: string;
  industry: string;
  category: string;
  /** One-line summary used on cards. */
  summary: string;
  seoTitle: string;
  seoDescription: string;
  services: string[];
  overview: string[];
  goals: string[];
  delivered: { title: string; body: string }[];
  approach: string[];
  status?: string;
  images: {
    desktop: ImageMetadata;
    long: ImageMetadata;
    mobile: ImageMetadata;
  };
  imageAlt: { desktop: string; long: string; mobile: string };
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: 'dc-granite-and-marble',
    name: 'D&C Granite & Marble',
    url: 'https://dcgraniteandmarble.net/',
    displayUrl: 'dcgraniteandmarble.net',
    industry: 'Stone fabrication & home improvement',
    category: 'Small-business transformation',
    featured: true,
    summary:
      'A complete website overhaul for a Western Massachusetts countertop fabricator, together with business email, IT support, and Google presence improvements.',
    seoTitle: 'D&C Granite & Marble Case Study — Website Overhaul',
    seoDescription:
      'How Northline Digital rebuilt the website, business email, and Google presence for D&C Granite & Marble, a countertop fabricator in Western Massachusetts.',
    services: ['Complete website overhaul', 'Business email overhaul', 'IT support', 'Google presence improvements'],
    overview: [
      'D&C Granite & Marble Design Gallery is a stone fabrication business based in Ludlow, Massachusetts, producing custom granite, quartz, and marble countertops, vanities, and fireplace surrounds for homeowners across Western Massachusetts and northern Connecticut.',
      'This was a full small-business engagement. Alongside a complete rebuild of the website, we overhauled the company’s business email, provided IT support, and improved how the business appears on Google.',
    ],
    goals: [
      'Present the craftsmanship of the business with a website that feels as premium as the finished work',
      'Make it simple for homeowners to understand the services and the countertop process',
      'Turn visits into quote requests and phone calls, especially on mobile',
      'Help the business be found by homeowners searching in the towns it serves',
      'Put professional, reliable email and digital foundations in place',
    ],
    delivered: [
      {
        title: 'A rebuilt, mobile-first website',
        body: 'A dark, refined visual identity built around the D&C logo and gold accents, with clear typography and layouts that work on every screen size.',
      },
      {
        title: 'Dedicated service pages',
        body: 'Individual pages for granite countertops, quartz countertops, bathroom vanities, bathroom remodeling, fireplace surrounds, and kitchen islands.',
      },
      {
        title: 'Local search foundations',
        body: 'Location pages for the communities the business serves, plus structured page titles, descriptions, and headings to support local search visibility.',
      },
      {
        title: 'Clear paths to contact',
        body: 'Prominent free-quote calls to action, click-to-call phone links, business hours, and the showroom address visible from every page.',
      },
      {
        title: 'Trust-building content',
        body: 'A project portfolio, customer reviews page, FAQ, blog, and a plain-language explanation of the process from showroom visit to installation.',
      },
      {
        title: 'Email, IT, and Google presence',
        body: 'A business email overhaul, hands-on IT support, and improvements to the company’s Google presence so customers see accurate, consistent information.',
      },
    ],
    approach: [
      'We started from the way homeowners actually buy countertops: they want to see real work, understand the process, and know they can reach a local shop easily. The site is organized around those three needs.',
      'Because the business serves many surrounding towns, the site structure was planned for local search from the start, with service and location pages that are genuinely useful to visitors rather than thin keyword pages.',
      'The engagement extended beyond the website. Fixing email and tidying up the company’s Google presence meant the business presents a consistent, professional face everywhere a customer might find it.',
    ],
    images: { desktop: dcDesktop, long: dcLong, mobile: dcMobile },
    imageAlt: {
      desktop:
        'Homepage of the D&C Granite & Marble website: a black and gold header with the headline “Custom Granite & Quartz Countertops in Springfield & Western Massachusetts.”',
      long: 'Extended view of the D&C Granite & Marble homepage showing the hero, four service cards, and the four-step countertop process.',
      mobile: 'The D&C Granite & Marble homepage displayed on a mobile phone.',
    },
  },
  {
    slug: 'realtorfinder',
    name: 'RealtorFinder',
    url: 'https://www.realtorfinder.net/',
    displayUrl: 'realtorfinder.net',
    industry: 'Real estate technology',
    category: 'Digital product & platform',
    status: 'Pre-launch — currently accepting waitlist sign-ups',
    summary:
      'Product design and development for a real estate platform where home sellers list once and licensed agents compete with proposals.',
    seoTitle: 'RealtorFinder Case Study — Platform Design',
    seoDescription:
      'Northline Digital designed and developed RealtorFinder, a reverse real estate marketplace platform that lets home sellers compare competing agent proposals.',
    services: ['Product strategy', 'Platform design', 'Web application development', 'Waitlist & onboarding flows'],
    overview: [
      'RealtorFinder is a real estate technology platform built around a simple idea: instead of sellers chasing agents, sellers post their home once and licensed realtors submit competing proposals covering commission, marketing plans, and experience.',
      'The platform is currently in pre-launch and is accepting waitlist sign-ups. This project demonstrates our work on digital products — where the website is the product, not just a brochure.',
    ],
    goals: [
      'Explain a new marketplace model clearly to three different audiences: sellers, buyers, and realtors',
      'Build trust for a brand-new platform without relying on unverified claims',
      'Capture early interest with a clear waitlist path before launch',
      'Lay foundations for account-based features such as sign-up, login, and proposal comparison',
    ],
    delivered: [
      {
        title: 'Marketplace positioning and messaging',
        body: 'A clear “list once, let agents compete” story supported by a step-by-step explanation and a side-by-side comparison with the traditional approach.',
      },
      {
        title: 'Audience-specific pages',
        body: 'Separate pathways for home sellers, buyers, and realtors so each audience sees the information relevant to them.',
      },
      {
        title: 'Pre-launch waitlist',
        body: 'An email waitlist with clear consent language and inline validation and confirmation states.',
      },
      {
        title: 'Account flows',
        body: 'Sign-up and login entry points designed to support the platform’s account-based features.',
      },
      {
        title: 'Editorial product design',
        body: 'A distinctive serif-and-coral identity, responsive layouts, and a structured FAQ that answers common objections.',
      },
      {
        title: 'Legal and trust pages',
        body: 'Privacy, terms, and cookie pages and a cookie notice, appropriate for a platform that collects personal information.',
      },
    ],
    approach: [
      'Marketplaces have a cold-start problem: they need to explain themselves to multiple audiences at once. We separated the seller, buyer, and realtor journeys so each one reads clearly instead of mixing every message on one page.',
      'Because the platform hasn’t launched, the site is deliberately honest about its status. The waitlist is the primary call to action, and the copy focuses on how the model works rather than on claims that can’t yet be backed up.',
      'The technical foundations were built for a product, not a brochure — with account flows and a structure that can grow as features roll out.',
    ],
    images: { desktop: rfDesktop, long: rfLong, mobile: rfMobile },
    imageAlt: {
      desktop:
        'RealtorFinder homepage with the headline “Sell Your Home. Let Agents Compete for You.”, a waitlist sign-up field, and a How It Works panel.',
      long: 'Extended view of the RealtorFinder homepage showing the hero, waitlist, and explanation of the reverse real estate marketplace.',
      mobile: 'The RealtorFinder homepage on a mobile phone, showing the headline and waitlist sign-up.',
    },
  },
  {
    slug: 'apex-aviation',
    name: 'Apex Aviation',
    url: 'https://apexaviationtx.com/home',
    displayUrl: 'apexaviationtx.com',
    industry: 'Aviation training',
    category: 'Specialized business website',
    summary:
      'A website for an Austin-area flight training business that supports training programs, digital study products, and customer inquiries.',
    seoTitle: 'Apex Aviation Case Study — Website for Flight Training',
    seoDescription:
      'How Northline Digital built a website connecting pilot training programs, digital checkride prep products, and inquiries for Apex Aviation in Austin, TX.',
    services: [
      'Website design & development',
      'Digital product pathways',
      'Member portal entry points',
      'Inquiry & booking flows',
    ],
    overview: [
      'Apex Aviation is an aviation training business in the Austin, Texas area serving pilots from their first lesson through Private, Instrument, and Commercial training.',
      'The business offers several kinds of products at once — live ground school classes, one-on-one mock oral exams, a digital checkride prep system, and a planned simulator facility. The website needed to bring all of that together into one clear customer journey.',
    ],
    goals: [
      'Explain a range of training programs to pilots at different stages',
      'Separate what’s available today from what’s planned, so customers aren’t confused',
      'Guide visitors toward free sign-up, paid digital products, and booked sessions',
      'Make it easy for prospective students to ask questions and get in touch',
    ],
    delivered: [
      {
        title: 'Program pages',
        body: 'Dedicated pages for Private Pilot, Instrument Rating, and Commercial Pilot training, along with programs, pricing, fleet, and instructor information.',
      },
      {
        title: 'Digital product pathways',
        body: 'Pages for the Apex Advantage ground school, the checkride prep question system, and the private pilot mock oral, each with clear pricing and next steps.',
      },
      {
        title: 'Member portal entry points',
        body: 'Free account sign-up and login flows that lead visitors from the marketing site into the member portal.',
      },
      {
        title: 'Clear availability messaging',
        body: 'Consistent labels showing what is live today versus what is opening later, from the hero banner through to individual offers.',
      },
      {
        title: 'Inquiry and booking',
        body: 'Prominent “Book a Session” calls to action, a contact page, and ground school location information.',
      },
      {
        title: 'Aviation-appropriate brand',
        body: 'A navy, gold, and white visual system with cockpit photography that fits a specialized, safety-focused industry.',
      },
    ],
    approach: [
      'Specialized businesses have specialized customers. Student pilots arrive with specific goals — a certificate, a rating, a checkride date — so the site is organized around training stages rather than generic service categories.',
      'With multiple offers launching at different times, clarity mattered more than anything. We made availability explicit throughout so visitors always know what they can start today.',
      'The site connects a marketing website with digital products and a member portal, showing how a small business can sell training, content, and services from one coherent online presence.',
    ],
    images: { desktop: apexDesktop, long: apexLong, mobile: apexMobile },
    imageAlt: {
      desktop:
        'Apex Aviation homepage with the headline “Train Beyond the Checkride.” over a photo of a pilot in a cockpit, with sign-up and Apex Advantage buttons.',
      long: 'Extended view of the Apex Aviation homepage showing the hero and the Apex Advantage training products.',
      mobile: 'The Apex Aviation homepage on a mobile phone.',
    },
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

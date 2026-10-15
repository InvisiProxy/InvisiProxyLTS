import {
	Cooking,
	Splash,
	Inline,
	route,
	values,
	SEO,
} from '../document-helpers.tsx';
import { ParticlesScript, PageScripts } from '../components/HeadScripts.tsx';
import HeadContent from '../components/HeadContent.tsx';
import AntiExfil from '../components/AntiExfil.tsx';
import Header from '../components/Header.tsx';
import Footer from '../components/Footer.tsx';

export default function Home() {
	return (
		<>
			<Cooking />
			<AntiExfil />
			<nav id="header" class="fullwidth" aria-label="Main navigation">
				<Header />
			</nav>
			{values.showSplash && (
				<div id="banner" class="fullwidth">
					<p class="text-center">
						<Splash />
					</p>
				</div>
			)}
			<div id="mainbody" class="fullwidth">
				<div id="background" class="fullwidth"></div>
				<section
					class="home-grid-container"
					aria-label="Home Grid Container"
				>
					<div class="home-text">
						<h1>
							<span>End Internet Censorship.</span>
						</h1>
						<h1>Privacy right at your fingertips.</h1>
						<a
							class="homebutton"
							href={route('/browsing')}
							aria-label="Bypass now"
						>
							Browse Now
						</a>
						<a
							class="homebutton mobile"
							href="#scrollfix"
							aria-label="Browse now"
						>
							Browse Now
						</a>
					</div>
					<Cooking />
					<section
						class="mac-window"
						aria-label="Command Line Instructions"
					>
						<div class="mac-title-bar">
							<div class="mac-buttons">
								<span class="mac-close"></span>
								<span class="mac-minimize"></span>
								<span class="mac-maximize"></span>
							</div>
						</div>
						<div class="mac-content">
							<p>
								<span class="cmd">
									{'git clone --recurse-submodules'}
									<span class="url">
										{' '}
										https://github.com/InvisiProxy/InvisiProxyLTS.git
									</span>
								</span>
								<br />
								<span class="cmd">
									{'cd '}
									InvisiProxyLTS{' '}
								</span>
								<br />
								<span class="comment">
									For first-time setup on a production
									branch...
								</span>
								<br />
								<span class="cmd">
									{'pnpm run fresh-start\r'}
								</span>
								<br />
								<span class="comment">Or typical uses...</span>
								<br />
								<span class="cmd">{'pnpm start\r'}</span>
								<br />
								<span class="comment">For development...</span>
								<br />
								<span class="cmd">{'pnpm dev\r'}</span>
								<br />
								<br />
								<span class="comment">
									InvisiProxy LTS
									{` v${values.version} // master`}
								</span>
								<br />
								<span class="comment">Node.js v26.x</span>
								<br />
								<span class="comment">Solid JS v1.9.17</span>
								<br />
								<br />
								<span class="downarrowgroup">
									<i class="fas fa-level-down-alt"></i>
									<i class="fas fa-level-down-alt"></i>
									<i class="fas fa-level-down-alt"></i>
								</span>
							</p>
						</div>
					</section>
				</section>
				<Cooking />
				<div id="scrollfix">­</div>
				<div data-aos="fade-right" class="hero-grid-container">
					<div class="box-hero">
						<div class="hero-content">
							<div class="hero-text-wrap">
								<div class="brand-logo-container">
									<i class="far fa-window-restore palered"></i>
									<h2 class="hero-content-header">
										InvisiProxy is free.
									</h2>
								</div>
								<p>
									Being open source, you can easily fork this
									repository and self host for maximum privacy
									control. In contrast to numerous other web
									proxy services, InvisiProxy stands out with
									end-to-end encryption via TLS, browser
									history isolation, Tor/Onion routing in
									Chromium browsers, complete transparency,
									and privacy control.{' '}
									<strong>
										Unlike other proxy services we collect
										no user data on our official instances.
										Not even for debugging purposes.
									</strong>
									<br></br>Our open-source dependecies (Wisp,
									Libcurl and Epoxy) are designed to be secure
									and privacy-focused, ensuring that your
									browsing experience remains confidential
									even with malicious self-hosted instances.
								</p>
								<div class="brand-logo-container">
									<i class="far fa-window-restore palered"></i>
									<h2 class="hero-content-header">
										InvisiProxy is fast and highly advanced.
									</h2>
								</div>
								<p>
									InvisiProxy delivers exceptional web proxy
									performance. It boasts a robust feature set
									including reCAPTCHA/Botguard support, Tor
									networking, SOCKS5 proxychaining,
									customizable blacklist settings, leak
									prevention, hidden history settings, and
									extensive site compatibility support via
									Scramjet + Wisp (Paired with Libcurl
									Transport). Other popular services like
									CroxyProxy or Proxium often only do half the
									job of rewriting assets leaking requests
									while being a privacy concern. This project
									also supports features like proxychaining,
									which allows you to route your traffic
									through multiple proxies for added security
									and anonymity.
								</p>
								<div class="brand-logo-container">
									<i class="far fa-window-restore palered"></i>
									<h2 class="hero-content-header">
										InvisiProxy is practical.
									</h2>
								</div>
								<p>
									Leveraging our source randomization and
									projects like Proxy Transports, Wisp, and
									Scramjet, this project delivers a seamless
									experience that circumvents web, government
									and network filters. This project works
									against filters used in China (GFW - Great
									Firewall of China), Russia and more{' '}
									<strong>
										without the need of downloading software
									</strong>
									. This is achieved entirely within your
									browser as a website and our backend (or
									your own if self-hosting), enabling users to
									bypass even the most invasive censorship
									blocks. No need to download anything simply
									type in the domain for InvisiProxy, head to
									the official InvisiProxy site to obtain
									mirrors if blocked and browse anonymously.
								</p>
							</div>
						</div>
						<div class="image-container-hero">
							<img
								class="hero"
								src={route('/assets/img/logo-light.webp')}
								alt="InvisiProxy Logo Hero"
							/>
							<h1>InvisiProxy LTS</h1>
							<h2>Free and transparent for use</h2>
							<a
								class="fancybutton glowbutton"
								href={route('/browsing')}
							>
								Browse Now
							</a>
							<a
								class="fancybutton glowbutton"
								href={route('/patreon')}
								target="_blank"
								rel="noopener noreferrer"
							>
								Donate
							</a>
						</div>
					</div>
				</div>
				<Cooking />
				<div data-aos="fade-right" class="carousel-container">
					<div class="carousel-wrapper">
						<div class="carousel">
							<div class="carousel-inner">
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route('/assets/img/solid.webp')}
										alt="SolidJS"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route(
											'/assets/img/nordtheme.webp'
										)}
										alt="Nord Theme"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route('/assets/img/nodejs.webp')}
										alt="Nodejs"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route(
											'/assets/img/fontawesome.webp'
										)}
										alt="Font Awesome"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route('/assets/img/scramjet.png')}
										alt="Scramjet"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route('/assets/img/solid.webp')}
										alt="SolidJS"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route(
											'/assets/img/nordtheme.webp'
										)}
										alt="Nord Theme"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route('/assets/img/nodejs.webp')}
										alt="Nodejs"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route(
											'/assets/img/fontawesome.webp'
										)}
										alt="Font Awesome"
									/>
								</div>
								<div class="dependencylogo">
									<img
										loading="lazy"
										src={route('/assets/img/scramjet.png')}
										alt="Scramjet"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
				<Cooking />
				<div class="text-center">
					<div class="splashstroke">
						<div>
							<h1 class="splashstrokeheader">
								{'\n              Designed with privacy'}
								<span class="underline-svg"></span>
								{'.\n            '}
							</h1>
						</div>
						<svg
							aria-hidden="true"
							class="underline-svg"
							viewBox="0 0 390 55"
							fill="none"
						>
							<defs>
								<linearGradient
									gradientUnits="userSpaceOnUse"
									x1="192.539"
									y1="1.537"
									x2="192.539"
									y2="51.098"
									id="gradient-0"
									gradientTransform="matrix(-0.001215, 0.999999, -7.795296, -0.009463, 402.484802, -163.600372)"
								>
									<stop
										offset="0"
										style="stop-color: rgba(135, 149, 221, 1)"
									></stop>
									<stop
										offset="1"
										style="stop-color: rgba(56, 80, 198, 1)"
									></stop>
								</linearGradient>
							</defs>
							<path
								style={
									'\n                stroke: url(#gradient-0);\n                stroke-width: 2px;\n                stroke-linecap: round;\n              '
								}
								d="M 3 8.997 C 3 8.997 386.2758229569146 -1.5119911685214125 386.872 5.292 C 387.1840859001393 8.853743500517725 283.1432491171007 17.09919545317559 283.106 22.586 C 283.07461319934777 27.209283823450303 356.0628379238926 30.04524568361604 356.607 35.864 C 357.0292218177662 40.3788405823717 314.606 51.924 314.606 51.924"
							></path>
						</svg>
					</div>
				</div>
				<Cooking />
				<div class="grid-container">
					<div data-aos="fade-right" id="info" class="box-card">
						<div class="content">
							<div class="text-wrap">
								<h1>Overview</h1>
								<p>
									InvisiProxy LTS, an experimental web proxy
									service, can bypass web filters or
									'blockers' regardless of whether the method
									of censorship is client-side or
									network-based. This includes the ability to
									bypass content blockers overseas put in
									place by governments (China/GFW, Russia,
									etc.), chrome extensions, localized client
									firewalls, and network-related filters.
								</p>
								<p>
									Please consider donating to this project so
									we can keep things free! We offer more
									domains per month, beta access, personal
									domains and priority feature requests.{' '}
									<br />
									{'\n                You can donate '}
									<a
										href={route('/patreon')}
										aria-label="Donate on Patreon"
										target="_blank"
										rel="noopener noreferrer"
									>
										on Patreon here
									</a>
									{'.\n              '}
								</p>
							</div>
						</div>
						<div class="image-container">
							<img
								class="hero"
								src={route('/assets/img/server.webp')}
								alt="Server Icon"
							/>
						</div>
					</div>
					<div data-aos="fade-left" class="box-card">
						<div class="content">
							<div class="text-wrap">
								<h1>Intent</h1>
								<p>
									This project serves mostly as a proof of
									concept for the ideal clientless solution to
									bypassing censorship. Being a secure web
									proxy service, it supports numerous sites
									while being updated frequently and
									concentrating on detail with design,
									mechanics, and features.
								</p>
								<p>
									{
										"\n                This project's palette is built using\n                "
									}
									<a
										href="https://nordtheme.com"
										target="_blank"
										rel="noopener noreferrer"
									>
										Nord Theme
									</a>
									{
										' for its optimal\n                design color palette and prioritization of readable code syntax\n                and UI components.\n              '
									}
								</p>
							</div>
						</div>
						<div class="image-container">
							<img
								class="hero"
								src={route('/assets/img/filecode.webp')}
								alt="File Code Icon"
							/>
						</div>
					</div>
					<div data-aos="fade-right" class="box-card">
						<div class="content">
							<div class="text-wrap">
								<h1>Usage</h1>
								<p>
									{
										'\n                Head to the\n                '
									}
									<a href={route('/browsing')}>Browse</a> page
									and select one of the proxies featured!
									Afterwards, type out the site you wish to
									access in the search box. Each web proxy has
									its own level of effectiveness, speed and
									security. It is recommended to use Scramjet.
									<br />
									<br />
									Example Website To Unblock:{' '}
									<code>https://youtube.com</code>
								</p>
							</div>
						</div>
						<div class="image-container">
							<img
								class="hero"
								src={route('/assets/img/shield.webp')}
								alt="Shield Icon"
							/>
						</div>
					</div>
					<div data-aos="fade-left" class="box-card">
						<div class="content">
							<div class="text-wrap">
								<h1>Apps</h1>
								<p>
									InvisiProxy features a collection of
									pre-linked applications, including YouTube,
									Spotify, GeForce NOW, Discord, ChatGPT,
									Gemini and more!
								</p>
							</div>
						</div>
						<div class="image-container">
							<img
								class="hero"
								src={route('/assets/img/apps.webp')}
								alt="Application Icon"
							/>
						</div>
					</div>
					<div data-aos="fade-right" class="box-card">
						<div class="content">
							<div class="text-wrap">
								<h1>Hosting and Deployment</h1>
								<p>
									<strong>InvisiProxy LTS</strong> is an
									open-source solution designed with
									modularity, ease of use, and easy deployment
									in mind. Key features include ad-blocking,
									flexible source code generation, and
									advanced proxy navigation.
									<br />
									<br /> For comprehensive setup instructions,
									visit our official{' '}
									<a
										href={route('/github')}
										title="InvisiProxy LTS GitHub Repository"
										target="_blank"
										rel="noopener noreferrer"
									>
										GitHub repository
									</a>
									{' or the '}
									<a
										href={route('/documentation')}
										title="Additional Hosting Information"
									>
										built-in documentation provided here
									</a>
									{'.\n              '}
								</p>
							</div>
						</div>
						<div class="image-container">
							<img
								class="hero"
								src={route('/assets/img/hosting.webp')}
								alt="Hosting and Deployment Icon"
								title="Hosting and Deployment for InvisiProxy LTS"
							/>
						</div>
					</div>
					<div data-aos="fade-left" class="box-card">
						<div class="content">
							<div class="text-wrap">
								<h1>Contributing</h1>
								<p>
									<strong>InvisiProxy LTS</strong> thrives due
									to the dedicated efforts of our amazing
									contributors. As an open-source project,{' '}
									<strong>InvisiProxy LTS</strong> relies on
									the passion of its community to bypass
									internet censorship and help users improve
									access to information.
								</p>
								<p>
									{
										'\n                To start contributing, visit our\n                '
									}
									<a
										href={route('/github')}
										title="InvisiProxy LTS GitHub Repository"
										target="_blank"
										rel="noopener noreferrer"
									>
										GitHub repository.
									</a>
								</p>
							</div>
						</div>
						<div class="image-container">
							<img
								class="hero"
								src={route('/assets/img/git.webp')}
								alt="Contributing GitHub Icon"
								title="Contribute to InvisiProxy LTS on GitHub"
							/>
						</div>
					</div>
				</div>
				<div data-aos="fade-left" class="hero-grid-container">
					<div class="box-hero">
						<div class="hero-content">
							<div class="hero-text-wrap">
								<div class="brand-logo-container">
									<i class="far fa-window-restore palered"></i>
									<h2 class="hero-content-header">
										Bypass Censorship and Filters
									</h2>
								</div>
								<p>
									InvisiProxy LTS is an open-source{' '}
									<strong>web proxy project</strong>. Enjoy
									unrestricted access to online content and
									browsing with our advanced{' '}
									<strong>web proxy unblocking</strong>{' '}
									features. This project also grants you the
									ability to self-host anywhere and bypass
									nation-wide/regional blocks like China
									(Great Firewall of China - GFW) and Russia.
								</p>
								<div class="brand-logo-container">
									<i class="far fa-window-restore palered"></i>
									<h2 class="hero-content-header">
										100% Free Web Proxy
									</h2>
								</div>
								<p>
									Benefit from our{' '}
									<strong>free web proxy service</strong>
									{' that helps\n                you '}
									<strong>unblock websites</strong> and access
									restricted content. Perfect for bypassing
									educational and/or workplace filters this
									project is made to unblock it all.
								</p>
								<div class="brand-logo-container">
									<i class="far fa-window-restore palered"></i>
									<h2 class="hero-content-header">
										Utilize Tor Routing Within Chromium
										Browsers &amp; Firefox
									</h2>
								</div>
								<p>
									Using InvisiProxy LTS, you can{' '}
									<strong>access the Tor network</strong>{' '}
									directly within your
									Chromium-based/Firefox-based browser. This
									means you can access <strong>.onion</strong>{' '}
									sites directly within this website. This
									allows you to browse the web anonymously (at
									least to some extent; real Tor has better
									fingerprinting mitigations), bypassing any
									regional restrictions. This project also
									supports setting custom SOCKS5 proxies to
									proxychain.
								</p>
							</div>
						</div>
						<Cooking />
						<div class="image-container-hero">
							<h1>Free Unrestricted Browsing</h1>
							<a
								class="fancybutton glowbutton"
								href={route('/browsing')}
							>
								Bypass Now
							</a>
						</div>
					</div>
				</div>
				<div class="box-home text-center splashend">
					<h1>It's time to browse the internet freely.</h1>
					<a class="homebutton" href="#scrollfix">
						Try InvisiProxy For Free
					</a>
					<a class="homebutton mobile" href={route('/browsing')}>
						Try InvisiProxy For Free
					</a>
				</div>
			</div>
			<div id="footer" class="fullwidth">
				<Footer />
			</div>
			<Cooking />
			<Inline>
				<script src={route('assets/js/card.js', 'inline')} />
			</Inline>
		</>
	);
}

export function Head() {
	return (
		<>
			<meta http-equiv="x-ua-compatible" content="IE=edge" />
			<meta name="version" content={values.version} />
			<SEO>
				<meta name="googlebot" content="index, follow, snippet" />
				<meta
					name="robots"
					content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
				/>
				<meta name="author" content="QuiteAFancyEmerald" />
				<meta name="application-name" content="InvisiProxy LTS" />
				<link rel="canonical" href="https://invisiproxy.com/" />
			</SEO>
			<title>
				InvisiProxy LTS | Free Web Proxy - Bypass Filters &amp; Access
				Blocked Sites
			</title>
			<SEO>
				<meta
					name="description"
					content="InvisiProxy LTS is a cutting-edge web proxy service designed to bypass web filters and blockers. Whether dealing with client-side or network-based censorship, InvisiProxy LTS provides seamless access to blocked sites and secure, private browsing on devices like Chromebooks. Overcome content blockers, Chrome extensions, firewalls, and more with our advanced proxy solution."
				/>
				<meta
					name="keywords"
					content="web proxy, free web proxy, proxy web browser, proxy web, proxy web page, proxy for web, secure proxy, unblock websites, free proxy, bypass censorship, unblock Chromebook, proxy service, online security, private browsing, unblock social media, access blocked content, proxy server, internet freedom, unblock at school, unblock at work"
				/>
				<meta property="og:site_name" content="InvisiProxy LTS" />
				<meta property="og:url" content="https://invisiproxy.com/" />
				<meta
					property="og:title"
					content={
						'InvisiProxy LTS | Free Web Proxy - Bypass Filters & Access Blocked Sites'
					}
				/>
				<meta property="og:type" content="website" />
				<meta
					property="og:description"
					content="InvisiProxy LTS is a top-tier web proxy service that bypasses network and browser restrictions to access blocked websites securely. Enjoy a seamless browsing experience with robust security and advanced features."
				/>
			</SEO>
			<meta property="og:image" content={route('assets/img/hero.webp')} />
			<meta
				property="og:image:secure_url"
				content={route('assets/img/hero.webp')}
			/>
			<SEO>
				<meta property="og:image:alt" content="InvisiProxy Logo" />
				<meta property="og:locale" content="en_US" />
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:site" content="@titaniumnetdev" />
				<meta name="twitter:creator" content="@titaniumnetdev" />
				<meta
					name="twitter:title"
					content={
						'InvisiProxy LTS | Free Web Proxy - Bypass Filters & Access Blocked Sites'
					}
				/>
				<meta
					name="twitter:description"
					content="Discover InvisiProxy LTS, a premier web proxy service that bypasses censorship and filters to provide secure access to blocked websites. Ideal for private browsing and overcoming network restrictions on devices like Chromebooks."
				/>
				<meta
					name="twitter:image"
					content={route('assets/img/hero.webp')}
				/>
				<meta name="twitter:image:alt" content="InvisiProxy Icon" />
			</SEO>
			<meta name="msapplication-TileColor" content="#b4213b" />
			<meta
				name="msapplication-TileImage"
				content={route('assets/ico/ms-icon-144x144.png')}
			/>
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta
				name="apple-mobile-web-app-status-bar-style"
				content="black-translucent"
			/>
			<SEO>
				<meta
					name="apple-mobile-web-app-title"
					content="InvisiProxy LTS"
				/>
			</SEO>
			<HeadContent />
			<ParticlesScript />
			<script
				src="https://unpkg.com/aos@next/dist/aos.js"
				defer={true}
				data-module=""
				innerHTML=""
			/>
			<PageScripts />
			<link
				rel="mask-icon"
				href={route('assets/svg/new.svg')}
				color="#b4213b"
			/>
			<link rel="manifest" href={route('manifest.json')} />
			<link
				rel="stylesheet"
				href="https://unpkg.com/aos@next/dist/aos.css"
			/>
			<meta name="mobile-web-app-capable" content="yes" />
			<SEO>
				<script
					type="application/ld+json"
					innerHTML={
						'\n      {\n        "@context": "https://schema.org",\n        "@type": "Organization",\n        "name": "InvisiProxy LTS",\n        "alternateName": "InvisiProxy",\n        "url": "https://invisiproxy.com",\n        "logo": "https://invisiproxy.com/assets/img/logo_github.png",\n        "sameAs": [\n          "https://github.com/QuiteAFancyEmerald/InvisiProxy"\n        ],\n        "description": "InvisiProxy is an advanced web proxy service designed to bypass network censorship and filters, providing a secure and private browsing experience. It supports a wide range of websites, including YouTube, and receives frequent updates to ensure optimal performance.",\n        "founder": {\n          "@type": "Person",\n          "name": "Quite A Fancy Emerald"\n        },\n        "foundingDate": "2020",\n        "contactPoint": {\n          "@type": "ContactPoint",\n          "contactType": "Customer Support",\n          "email": "8xz62b0ce@mozmail.com",\n          "url": "https://invisiproxy.com/credits"\n        }\n      }\n    '
					}
				/>
				<script
					type="application/ld+json"
					innerHTML={
						'\n      {\n        "@context": "https://schema.org",\n        "@type": "FAQPage",\n        "mainEntity": [\n          {\n            "@type": "Question",\n            "name": "What is InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy is a free and secure web proxy service designed to bypass web filters and blockers. It supports numerous sites, emphasizing detailed design, mechanics, and advanced features to provide a seamless browsing experience."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "How do I unblock websites at school using InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "To unblock websites at school, use InvisiProxy, a free web proxy service that is frequently updated. If a site gets blocked, use the link generator on another device. Monthly restocks help prevent mass blocking."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "What websites can I access with InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy allows access to a wide variety of websites, including popular sites like Discord, Spotify, YouTube, and many game sites."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "Is InvisiProxy safe to use?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "Absolutely! InvisiProxy ensures a safe browsing experience by not collecting or logging any user data. Refer to our Privacy Policy for more details. Additionally, InvisiProxy is open-source, ensuring full transparency."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "Does InvisiProxy hide my search history?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "Yes, InvisiProxy hides your search history. You can customize your tab appearance via Settings > Tab Cloak and use Stealth mode for private browsing."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "How can I get more InvisiProxy sites?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "Use the link button in the top right corner of most InvisiProxy pages."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "Is InvisiProxy open-source?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "Yes, InvisiProxy is open-source. Visit our GitHub to deploy or host your own instance of InvisiProxy, ensuring maximum privacy control."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "How fast and advanced is InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy is a fast and highly advanced web proxy service, featuring CAPTCHA integration, TOR browsing, customizable blacklist settings, leak prevention mechanisms, robust security measures, and extensive site compatibility via Scramjet + Wisp."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "Can I self-host InvisiProxy for better privacy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "Yes, you can easily fork the InvisiProxy repository and self-host it for maximum privacy control, ensuring no user data is collected."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "What makes InvisiProxy different from other web proxy services?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy stands out with its transparency and privacy control, collecting no user data. It leverages custom source randomization and projects like Proxy Transports, Wisp, and Scramjet to effectively bypass web and network filters."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "What design principles does InvisiProxy follow?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy uses the Nord Theme for its optimal design color palette, prioritizing readable code syntax and user-friendly UI components."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "How do I start using InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "Head to the Web Proxies page and select one of the featured proxies. Then, type the site you wish to access in the search box. Each web proxy has its own level of effectiveness, speed, and security. Scramjet is highly recommended for the best experience."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "What pre-linked applications does InvisiProxy feature?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy features a collection of pre-linked applications, including YouTube, Spotify, Webretro (an online everything emulator), Ruffle.fs (Adobe Flash Emulator), and an expansive library for each respective app."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "How do I deploy InvisiProxy on my own server?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy is designed to be easy to deploy and use on personal setups or production loads. Detailed guides can be found at the official GitHub repository and built-in docs."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "Where is the default proxy location when starting InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "The default place for the proxy when started is http://localhost:8080. You can change this setting if needed in config.json. This website is hosted locally with Scramjet built-in."\n            }\n          },\n          {\n            "@type": "Question",\n            "name": "How can I contribute to InvisiProxy?",\n            "acceptedAnswer": {\n              "@type": "Answer",\n              "text": "InvisiProxy thrives thanks to its contributors. You can get involved in various ways, including design, core development, applications, documentation, and testing and QA. Visit our GitHub repository and join our Discord server to get started."\n            }\n          }\n        ]\n      }\n    '
					}
				/>
			</SEO>
		</>
	);
}

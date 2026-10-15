import { route } from '../document-helpers.tsx';

export default function Footer() {
	return (
		<>
			<div class="footerflex">
				<div class="footerbrand">
					<h3>
						<a href={route('/')} title="InvisiProxy Homepage">
							InvisiProxy
						</a>
					</h3>
					<p>Global Web Proxy Innovation, Done Right.</p>
					<div class="logo-potato"></div>
				</div>
				<div class="footerlist">
					<h3>Dependencies</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/solidjs')}
								title="SolidJS  - Simple and performant reactivity for building user interfaces.."
							>
								SolidJS{' '}
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/wispurr')}
								title="High-Performance and Feature Focused Wisp v1/v2 Server implementation in Golang."
							>
								Wispurr{' '}
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/nord-theme')}
								title="Nord Theme - An arctic, north-bluish color palette."
							>
								Nord Theme
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<h3>Transports</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/libcurl')}
							>
								Libcurl
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/epoxy')}
							>
								Epoxy
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<h3>Services</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/scramjet')}
								title="Scramjet - Scramjet is a versatile web proxy designed to bypass internet censorship."
							>
								Scramjet
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/wisp')}
								title="Wisp - Wisp is a low-overhead, easy to implement protocol for proxying multiple TCP/UDP sockets over a single websocket."
							>
								Wisp Protocol
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/proxy-transports')}
								title="Proxy Transports - The transport interface used by Scramjet."
							>
								Proxy Transports
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github/merp')}
								title="Merp - Advanced obfuscation module"
							>
								Merp Obfuscation
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<h3>About</h3>
					<ul>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/github')}
								title="InvisiProxy GitHub Repository"
							>
								GitHub
							</a>
						</li>
						<li>
							<a
								target="_blank"
								rel="noopener noreferrer"
								href={route('/patreon')}
								title="Follow InvisiProxy on Patreon"
							>
								Patreon
							</a>
						</li>
						<li>
							<a
								href={route('/privacy')}
								title="Privacy Policy"
							>
								Privacy Policy
							</a>
						</li>
						<li>
							<a
								href={route('/credits')}
								title="Credits and Acknowledgements"
							>
								Credits
							</a>
						</li>
					</ul>
				</div>
				<div class="footerlist">
					<a href="#top" title="Back to Top">
						<span class="sr-only">Back to Top</span>
						<i
							class="fas fa-angle-double-up"
							aria-hidden="true"
						></i>
					</a>
				</div>
			</div>
			<div class="footersocials">
				<a
					target="_blank"
					rel="noopener noreferrer"
					href={route('/github')}
					title="Follow InvisiProxy on GitHub"
				>
					<span class="sr-only">Follow InvisiProxy on GitHub</span>
					<i class="fab fa-github" aria-hidden="true"></i>
				</a>
				<a
					target="_blank"
					rel="noopener noreferrer"
					href={route('/patreon')}
					title="Follow InvisiProxy on Patreon"
				>
					<span class="sr-only">Follow InvisiProxy on Patreon</span>
					<i class="fab fa-patreon" aria-hidden="true"></i>
				</a>
				<a
					target="_blank"
					rel="noopener noreferrer"
					href={route('/kofi')}
					title="Follow Developer on Ko-fi"
				>
					<span class="sr-only">Follow Developer on Ko-fi</span>
					<i class="fas fa-coffee" aria-hidden="true"></i>
				</a>
			</div>
			<p class="copyright">InvisiProxy LTS 2020-2026</p>
		</>
	);
}

import { Cooking, iconBookmarklet } from '../document-helpers.tsx';

export default function FAQ() {
	return (
		<>
			<div class="faq-center bigtitle">
				<h1>Frequently Asked Questions</h1>
			</div>
			<div class="faq-box">
				<div id="faq-search-root">
					<input
						class="faq-search"
						type="text"
						autocomplete="off"
						spellcheck="false"
						placeholder="Search"
					/>
				</div>
			</div>
			<br></br>
			<div id="faqs" class="faq">
				<div class="faq-text">
					<h3>
						<strong>
							How do I obtain Icon URLs for the Tab Cloaking menu?
						</strong>
					</h3>
					<p>
						Go to the website you want an icon from, then use this
						bookmarklet (drag it to your bookmarks bar):
					</p>
					<br></br>
					<div id="bks-parent">
						<a
							href={iconBookmarklet()}
							id="iconfinder"
							class="fancybutton fb-l glowbutton"
						>
							Find Icon URL
						</a>
					</div>
					<br></br>
					<p>
						Copy the URL that the bookmarklet gives you. Then go
						back to InvisiProxy and enter in the URL for the Icon
						URL in Settings. Enjoy!
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							I am getting "Network Error" or Site Error every
							time I use the proxy?
						</strong>
					</h3>
					<p>
						This is a known issue with our modern web proxies. Due
						to the amount of users we get typically after ten
						minutes of no tab activity the connection is cut. Simply
						hit the Refresh Page button and reload the page to
						resolve the issue.
					</p>
					<p>
						This typically happens the first time you use the proxy.
						We have a future fix for this.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							I am having problems logging into sites or viewing
							content since it thinks I am a bot.
						</strong>
					</h3>
					<p>
						During peak traffic hours this is very common due to
						everything going through only two respective IPs. The
						solution is to swap regions via Region Selection or
						enable Tor routing. You can also join our Patreon for
						access to a instance with a residential ISP to avoid
						this issue.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							I am getting an error similar to: "'cdn.example.com'
							cannot be reached."
						</strong>
					</h3>
					<p>
						Reload the page. If that doesn't work the first time,
						simply use the browser's back button or head back to the
						Scramjet page and try again.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							Why is my site loading in partially or just blank?
						</strong>
					</h3>
					<p>
						Not all websites are supported. Naturally this is due to
						the wide expanses of the web with different technologies
						and methods of loading content. If you are having issues
						with a specific site, please report it to us on our
						Discord server or GitHub. Otherwise try filtering
						through our proxy options to see if one of them supports
						the site.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							I am getting an error referencing an IDB Database
							(Scramjet V1 issue)
						</strong>
					</h3>
					<p>
						This typically happens whenever we do updates to our
						project. Simply click on the (i) icon in the top left
						corner of your browser (or lock symbol) and select
						"Clear Site Data" or "Clear Cookies and Site Data &gt;
						Manage On-Site Data &gt; Trash Icon". This will clear
						the IndexedDB database and allow you to use the proxy
						again.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>Is Discord supported?</strong>
					</h3>
					<p>Yes, Discord is supported.</p>
					<ul>
						<li>
							However, there are some limitations with the free
							proxies. Ensure that you don't utilize your main
							account unless if you are self-hosting or using a
							small domain.
						</li>
					</ul>
				</div>
				<div class="faq-text">
					<h3>
						<strong>Why are YouTube videos not working?</strong>
					</h3>
					<p>
						If you are having persistent issues even after doing the
						steps above there is a chance that the instance is down
						temporarily, especially if large groups of people are
						also having the issue. This issue doesn't happen for
						self-hosting.
					</p>
					<p>
						Try selecting the "Tor" option as this may fix the
						problem but greatly reduce loading speeds.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>Is it safe for me to login to sites?"</strong>
					</h3>
					<p>
						Yes, it is safe to login to sites. However, we recommend
						that you do not login into sites you do not trust or use
						personal accounts due to the number of traffic being
						routed into a single domain. We try to migate this
						problem by rotating IPs however it is just a common
						practice to not use personal accounts on public proxies.
						Self-hosting however you can do so with ease. You can
						also join the patreon to utilize a residential ISP and
						avoid this issue.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							Why is the site I am on not working correctly or
							having CAPTCHA errors?
						</strong>
					</h3>
					<p>
						Captcha support works with Scramjet but it will take
						trial and error. The reason for this is Scramjet is
						often simply too fast and naturally CAPTCHA is very
						spotty. The solution is just keep trying to solve the
						CAPTCHA until it works. Try not to go too fast.
					</p>
				</div>
				<div class="faq-text">
					<h3>
						<strong>
							{' '}
							When using YouTube on any of the proxy sites, why
							does the page not load fully or the video is just
							white?
						</strong>
					</h3>
					<p>There are two methods for fixing this:</p>
					<ul>
						<li>
							<p>
								Reloading the page normally when the error above
								happens should load the video.
							</p>
						</li>
						<li>
							<p>
								{
									'\n          Or right-clicking the page and doing\n          '
								}
								<code>Reload Frame</code> if you are using some
								form of Stealth Mode.
							</p>
						</li>
					</ul>
				</div>
			</div>
		</>
	);
}

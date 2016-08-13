new Promise( resolve => {
	if(document.readyState === 'complete') {
		resolve();
	} else {
		window.onload = resolve;
	}
}).then( () => {
	return new Promise( (resolve, reject) => {
		VK.init({
			apiId: 5577017
		});

		VK.Auth.login( response => {
			if(response.session) {
				resolve(response);
			} else {
				reject(new Error('Не удалось авторизоваться'))
			}
		}, 2);
	});
}).then( () => {

	function btnStateChange(button, containingList = 'defaultList') {
		if(containingList === 'filteredList') {
			button.classList.remove('friendlist-item__btn_add');
			button.classList.add('friendlist-item__btn_remove');
			button.setAttribute('data-role', 'remove');
		} else {
			button.classList.remove('friendlist-item__btn_remove');
			button.classList.add('friendlist-item__btn_add');
			button.setAttribute('data-role', 'add');
		}
	}

	// Drag and Drop
	( () => {
		let item = null;
		document.addEventListener('dragstart', e => {
			item = e.target;
			item.style.opacity = '0.4';
			e.dataTransfer.setData('text', '');
			function getCoords(elem) {
				let box = elem.getBoundingClientRect();
				return {
					top: box.top + pageYOffset,
					left: box.left + pageXOffset
				};
			}
			let shiftX = e.pageX - getCoords(item).left,
					shiftY = e.pageY - getCoords(item).top;
			e.dataTransfer.setDragImage(e.target, shiftX, shiftY);
		});
		document.addEventListener('dragover', e => {
			if(item) {
				e.preventDefault();
			}
		});
		document.addEventListener('drop', e => {
			let dropArea = e.target.closest('[data-draggable="target"]');
			if(dropArea) {
				if(dropArea.getAttribute('id') == 'filteredList') {
					btnStateChange(item.lastElementChild, 'filteredList');
				} else {
					btnStateChange(item.lastElementChild);
				}
				dropArea.insertBefore(item, e.target.closest('[data-draggable="item"]'));
				e.preventDefault();
			}
		});
		document.addEventListener('dragend', e => {
			item.style.opacity = '1';
			item = null;
		});
	})();

	// Add by button
	mainContainer.addEventListener('click', e => {
		if(e.target.getAttribute('data-role') === 'remove') {
			btnStateChange(e.target);
			defaultList.insertBefore(e.target.parentNode, defaultList.firstElementChild);
		} else if(e.target.getAttribute('data-role') === 'add') {
			btnStateChange(e.target, 'filteredList');
			filteredList.insertBefore(e.target.parentNode, filteredList.firstElementChild);
		}
	}); 

	// Saving the list
	saveBtn.addEventListener('click', e => {
		function dataToJson(list) {
			let friendsData = [];
			for(let item of list) {
				let img = item.firstElementChild,
						fullName = img.nextElementSibling.textContent.split(' '),
						firstName = fullName[0],
						lastName = fullName[1];
				friendsData.push({
					photo_50: img.getAttribute('src'),
					first_name: firstName,
					last_name: lastName 
				});
			}
			return JSON.stringify(friendsData);
		}
		localStorage.setItem('filteredList', dataToJson(filteredList.children));
		localStorage.setItem('defaultList', dataToJson(defaultList.children));
	});

	// Searching
	mainContainer.addEventListener('keyup', e => {

		function searchingOutput(input, list) {
			let searchRes = [].filter.call(list, elem => {
				let firstName = elem.children[1].textContent.split(' ')[0].toLowerCase(),
						lastName = elem.children[1].textContent.split(' ')[1].toLowerCase();

				function isValid(str) {
					for(let i = 0; i < input.length; i++) {
						if(str[i] !== input[i]) return false
					}
					return true;
				}
					
				return isValid(firstName) || isValid(lastName);
			});
			if(input.length === 0) {
				list = [].forEach.call(list, elem => {
					elem.removeAttribute('style');
				});
			} else {
				list = [].forEach.call(list, elem => {
					elem.style.display = 'none';
					if(searchRes.includes(elem)) elem.removeAttribute('style')
				});
			}
		}

		if(e.target.getAttribute('name') === 'defaultListSearch') {
			let inputContent = e.target.value.toLowerCase().trim(),
					list = defaultList.children;
			searchingOutput(inputContent, list);
		} else if(e.target.getAttribute('name') === 'filteredListSearch') {
			let inputContent = e.target.value.toLowerCase().trim(),
					list = filteredList.children;
			searchingOutput(inputContent, list);
		}
		
	});

	return new Promise( (resolve, reject) => {
		VK.api('friends.get', {fields: ['photo_50']}, response => {
			if(response.error) {
				reject(new Error(response.error.error_msg));
			} else {
				if(localStorage.getItem('filteredList')) {
					let selected = JSON.parse(localStorage.getItem('filteredList')),
							// notSelected = JSON.parse(localStorage.getItem('defaultList'));
							notSelected = response.response.filter( item => {
								for(let selItem of selected) {
									if(item.photo_50 === selItem.photo_50) return false
								}
								return true;
							});
					let source = friendListTemplate.innerHTML,
						template = Handlebars.compile(source),
						filteredFriendList = template({friendList: selected}),
						defaultFriendList = template({friendList: notSelected});
					defaultList.innerHTML = defaultFriendList;
					filteredList.innerHTML = filteredFriendList;
					for(let item of filteredList.children) {
						btnStateChange(item.lastElementChild, 'filteredList');
					}
				} else {
					let source = friendListTemplate.innerHTML,
							template = Handlebars.compile(source),
							friendList = template({friendList: response.response});
					defaultList.innerHTML = friendList;
				}
				$('#friendSelectModal').modal('toggle');
			}
		});
	});

},
err => alert(err.message)
).catch( err => alert(`Ошибка: ${err.message}`));
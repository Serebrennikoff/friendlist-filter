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

		function getCoords(elem) {
			let box = elem.getBoundingClientRect();
			return {
				top: box.top + pageYOffset,
				left: box.left + pageXOffset
			};
		}

		document.addEventListener('dragstart', e => {
			item = e.target;
			item.style.opacity = '0.4';
			e.dataTransfer.setData('text', '');
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
	( () => {
		function dataToJson(list) {
			let friendsData = [];
			for(let item of list) {
				let fullName = item.children.item(1).textContent.split(' '),
						firstName = fullName[0],
						lastName = fullName[1];
				friendsData.push({
					first_name: firstName,
					last_name: lastName 
				});
			}
			return JSON.stringify(friendsData);
		}

		saveBtn.addEventListener('click', e => {
			localStorage.setItem('filteredList', dataToJson(filteredList.children));
		});
	})();

	// Searching
	( () => {

		function isValid(input, str) {
			for(let i = 0; i < input.length; i++) {
				if(str[i] !== input[i]) return false
			}
			return true;
		}

		function searchingOutput(input, list) {
			let searchRes = Array.prototype.filter.call(list, elem => {
				let firstName = elem.children[1].textContent.split(' ')[0].toLowerCase(),
						lastName = elem.children[1].textContent.split(' ')[1].toLowerCase();
				if(input.includes(' ')) {
					let inputComponents = input.split(' ');
				 	return 	isValid(inputComponents[0], firstName) && isValid(inputComponents[1], lastName);
				} else {
				 return isValid(input, firstName) || isValid(input, lastName);
				}
			});
			if(input.length === 0) {
				list = Array.prototype.forEach.call(list, elem => {
					elem.removeAttribute('style');
				});
			} else {
				list = Array.prototype.forEach.call(list, elem => {
					elem.style.display = 'none';
					if(searchRes.includes(elem)) elem.removeAttribute('style')
				});
			}
		}

		mainContainer.addEventListener('keyup', e => {
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
	})();

	return new Promise( (resolve, reject) => {
		VK.api('friends.get', {fields: ['photo_50']}, response => {
			if(response.error) {
				reject(new Error(response.error.error_msg));
			} else {
				if(localStorage.getItem('filteredList')) {

					function filterResponse(item, storedData) {
						for(let storedItem of storedData) {
							if(item.first_name === storedItem.first_name &&
								 item.last_name === storedItem.last_name) return false
							}
						return true;
					}

					let stored = JSON.parse(localStorage.getItem('filteredList')),
							notSelected = response.response.filter( item => {
								return filterResponse(item, stored);
							}),
							selected = response.response.filter( item => {
								return !filterResponse(item, stored);
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